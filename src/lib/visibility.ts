import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { descendantIds } from './orgRoles'
import { getRole, getUserId } from './permissions'
import type { ClientVisibility, TaskVisibility } from './visibilityShared'
import type { ViewScope } from './scopesShared'

// Visibilita' dei record in base al ruolo aziendale (gerarchia) della persona.
// - profilo Admin: vede tutto;
// - persona senza ruolo: vede tutto (comportamento di prima);
// - altrimenti il ruolo decide: task "propri", "propri + ruoli sottostanti" o "tutti"; clienti "tutti" o "solo collegati".
export interface Visibility {
  userId: string
  all: boolean // vede tutti i task
  ownerIds: string[] // proprietari i cui record sono visibili (se !all)
  clientAll: boolean // vede tutti i clienti
  teamIds: string[] // io + le persone dei ruoli sottostanti (per la vista "Del mio team")
}

const cache = new Map<string, { at: number; v: Visibility }>()
const TTL_MS = 10_000

export function clearVisibilityCache() {
  cache.clear()
}

export async function getVisibility(session: any): Promise<Visibility> {
  const userId = getUserId(session)
  const isAdminUser = getRole(session) === 'admin'
  const everything: Visibility = { userId, all: true, ownerIds: [], clientAll: true, teamIds: [userId] }
  if (!userId) return everything

  const hit = cache.get(userId)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.v

  let v = everything
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { orgRoleId: true } })
    let teamIds: string[] = [userId]
    let mine: { id: string; taskVisibility: string; clientVisibility: string } | undefined
    // l'admin vede tutto: per lui "il team" e' "tutti", quindi non serve calcolare la gerarchia
    if (user?.orgRoleId && !isAdminUser) {
      const roles = await prisma.orgRole.findMany()
      mine = roles.find((r) => r.id === user.orgRoleId)
      if (mine) {
        const below = descendantIds(roles, mine.id)
        if (below.length > 0) {
          const people = await prisma.user.findMany({ where: { orgRoleId: { in: below } }, select: { id: true } })
          teamIds = [userId, ...people.map((p) => p.id)]
        }
      }
    }
    if (isAdminUser) {
      v = everything
    } else if (mine) {
      const taskMode = mine.taskVisibility as TaskVisibility
      const clientMode = mine.clientVisibility as ClientVisibility
      const ownerIds = taskMode === 'own_and_below' ? teamIds : [userId]
      v = { userId, all: taskMode === 'all', ownerIds, clientAll: clientMode === 'all', teamIds }
    } else {
      v = { ...everything, teamIds }
    }
  } catch {
    // se la lettura fallisce non si blocca nessuno: valgono le regole di prima
    v = everything
  }
  cache.set(userId, { at: Date.now(), v })
  return v
}

// "Si puo' vedere il team": ha senso mostrare l'interruttore "I miei / Tutto il team" solo se si vede qualcosa oltre ai propri record.
export function canSeeTeam(v: Visibility): boolean {
  return v.all || v.ownerIds.some((id) => id !== v.userId)
}

// Un task e' visibile se e' di una persona visibile, se lo ho creato io, o se ho un sub-task al suo interno.
export function taskWhere(v: Visibility): Prisma.TaskWhereInput {
  if (v.all) return {}
  return {
    OR: [
      { ownerId: { in: v.ownerIds } },
      { createdById: v.userId },
      { subtasks: { some: { ownerId: { in: v.ownerIds } } } }
    ]
  }
}

// Un sub-task e' visibile se e' di una persona visibile, se il task padre e' di una persona visibile, o se l'ho creato io.
export function subtaskWhere(v: Visibility): Prisma.SubtaskWhereInput {
  if (v.all) return {}
  return {
    OR: [{ ownerId: { in: v.ownerIds } }, { task: { ownerId: { in: v.ownerIds } } }, { createdById: v.userId }]
  }
}

// Stessa regola dei sub-task, in memoria (per filtrare i sub-task dentro un task gia' caricato).
export function canSeeSubtask(v: Visibility, s: { ownerId?: string; owner?: { id: string }; createdById?: string | null }, taskOwnerId: string): boolean {
  if (v.all) return true
  const ownerId = s.ownerId ?? s.owner?.id
  return (
    (!!ownerId && v.ownerIds.includes(ownerId)) ||
    v.ownerIds.includes(taskOwnerId) ||
    (!!s.createdById && s.createdById === v.userId)
  )
}

// Un cliente e' visibile a tutti oppure, in modalita' "collegati", se e' mio o ha almeno un task visibile.
export function clientWhere(v: Visibility): Prisma.ClientWhereInput {
  if (v.clientAll) return {}
  return {
    OR: [{ ownerId: { in: v.ownerIds } }, { createdById: v.userId }, { tasks: { some: taskWhere(v) } }]
  }
}

export async function canSeeTask(v: Visibility, taskId: string): Promise<boolean> {
  if (v.all) return true
  return !!(await prisma.task.findFirst({ where: { id: taskId, ...taskWhere(v) }, select: { id: true } }))
}

export async function canSeeSubtaskById(v: Visibility, subtaskId: string): Promise<boolean> {
  if (v.all) return true
  return !!(await prisma.subtask.findFirst({ where: { id: subtaskId, ...subtaskWhere(v) }, select: { id: true } }))
}

export async function canSeeClient(v: Visibility, clientId: string): Promise<boolean> {
  if (v.clientAll) return true
  return !!(await prisma.client.findFirst({ where: { id: clientId, ...clientWhere(v) }, select: { id: true } }))
}

// Per le viste "tutto il team" (Home, Report): i record dei proprietari visibili.
export function teamOwnerWhere(v: Visibility): { ownerId?: { in: string[] } } {
  return v.all ? {} : { ownerId: { in: v.ownerIds } }
}

// Viste standard dei record: "miei", "del mio team", "tutti".
// - miei: sempre; team: se ho persone nei ruoli sottostanti;
// - tutti: nelle liste e' sempre disponibile (= tutti i record che posso vedere, compresi quelli dove ho solo un sub-task);
//   con ownerBased (Home, Report: conteggi per proprietario) solo se vedo tutti i task, altrimenti coinciderebbe con le altre.
export function availableScopes(v: Visibility, ownerBased = false): ViewScope[] {
  const out: ViewScope[] = ['mine']
  if (v.teamIds.length > 1) out.push('team')
  if (!ownerBased || v.all) out.push('all')
  return out
}

// Porta la vista richiesta a una disponibile: se non lo e', si usa la piu' ampia consentita.
export function resolveScope(v: Visibility, requested?: string | null, ownerBased = false): ViewScope {
  const list = availableScopes(v, ownerBased)
  if (requested && (list as string[]).includes(requested)) return requested as ViewScope
  return list[list.length - 1]
}

// Filtro sul proprietario dei record (task e sub-task) per una vista; "tutti" = quelli visibili.
export function scopeOwnerWhere(v: Visibility, scope: ViewScope): { ownerId?: string | { in: string[] } } {
  if (scope === 'mine') return { ownerId: v.userId }
  if (scope === 'team') return { ownerId: { in: v.teamIds } }
  return teamOwnerWhere(v)
}
