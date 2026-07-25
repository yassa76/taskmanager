import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deriveTaskStatus } from '@/lib/taskStatus'
import { isAdmin } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const userId = (session.user as any).id
  const { searchParams } = new URL(req.url)
  // "Tutto il team" e' selezionabile solo dagli admin: verificato lato server,
  // un utente normale vede sempre e solo i propri dati anche se forzasse il parametro.
  const teamScope = searchParams.get('scope') === 'team' && isAdmin(session)

  // Filtro temporale: se presente, considera solo i record creati da quella data in poi.
  const sinceParam = searchParams.get('since')
  const since = sinceParam ? new Date(sinceParam) : null

  // Se false (default, come in Home), completati/annullati sono esclusi da tutti i grafici.
  const includeClosed = searchParams.get('includeClosed') === 'true'

  const taskWhere = {
    ...(teamScope ? {} : { ownerId: userId }),
    ...(since ? { createdAt: { gte: since } } : {})
  }
  const subtaskWhere = {
    ...(teamScope ? {} : { ownerId: userId }),
    ...(since ? { createdAt: { gte: since } } : {})
  }

  const [tasks, subtasks] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      include: {
        owner: true,
        client: true,
        subtasks: true
      }
    }),
    prisma.subtask.findMany({
      where: subtaskWhere,
      include: { owner: true }
    })
  ])

  const now = new Date()

  let enriched = tasks.map((t) => {
    const derived = deriveTaskStatus(t.subtasks.map((s) => s.status), t.closedManually, t.statusOverride)
    const overdue = !!t.endDate && t.endDate < now && derived.status !== 'completato' && derived.status !== 'annullato'
    return { ...t, derived, overdue }
  })

  let activeSubtasks = subtasks

  // Le KPI "Completati"/"Annullati"/% completamento restano sempre calcolate
  // sul set completo (altrimenti non avrebbero senso), ma vengono calcolate
  // PRIMA di applicare il filtro includeClosed ai grafici.
  const totalTasksAll = enriched.length
  const completed = enriched.filter((t) => t.derived.status === 'completato').length
  const inProgress = enriched.filter((t) => t.derived.status === 'in_corso').length
  const notStarted = enriched.filter((t) => t.derived.status === 'da_avviare').length
  const cancelled = enriched.filter((t) => t.derived.status === 'annullato').length
  const overdue = enriched.filter((t) => t.overdue).length

  const totalSubtasksAll = tasks.reduce((acc, t) => acc + t.subtasks.length, 0)
  const completedSubtasks = tasks.reduce(
    (acc, t) => acc + t.subtasks.filter((s) => s.status === 'completato').length,
    0
  )

  // Distribuzione stati (per grafico a torta) — questa mostra sempre tutti gli
  // stati, incluso completati/annullati, perche' e' proprio il suo scopo.
  const statusDistribution = [
    { name: 'Da avviare', value: notStarted },
    { name: 'In corso', value: inProgress },
    { name: 'Completato', value: completed },
    { name: 'Annullato', value: cancelled }
  ]

  // Da qui in poi, per i grafici "operativi" (per owner, per cliente, carico
  // di lavoro), se includeClosed e' false nascondiamo completati/annullati,
  // cosi' i grafici riflettono il lavoro ancora attivo.
  if (!includeClosed) {
    enriched = enriched.filter((t) => t.derived.status !== 'completato' && t.derived.status !== 'annullato')
    activeSubtasks = activeSubtasks.filter((s) => s.status !== 'completato' && s.status !== 'annullato')
  }

  // Task per owner
  const byOwnerMap = new Map<string, { id: string; name: string; total: number; completati: number }>()
  for (const t of enriched) {
    const key = t.owner.id
    const cur = byOwnerMap.get(key) || { id: t.owner.id, name: t.owner.name || t.owner.email, total: 0, completati: 0 }
    cur.total += 1
    if (t.derived.status === 'completato') cur.completati += 1
    byOwnerMap.set(key, cur)
  }
  const byOwner = Array.from(byOwnerMap.values())

  // Carico di lavoro per persona: task + sub-task sommati, suddivisi per stato.
  const byOwnerStatusMap = new Map<
    string,
    { id: string; name: string; da_avviare: number; in_corso: number; completato: number; annullato: number }
  >()
  function bumpOwnerStatus(ownerId: string, ownerLabel: string, status: string) {
    const cur =
      byOwnerStatusMap.get(ownerId) ||
      { id: ownerId, name: ownerLabel, da_avviare: 0, in_corso: 0, completato: 0, annullato: 0 }
    if (status === 'da_avviare' || status === 'in_corso' || status === 'completato' || status === 'annullato') {
      cur[status] += 1
    }
    byOwnerStatusMap.set(ownerId, cur)
  }
  for (const t of enriched) {
    bumpOwnerStatus(t.owner.id, t.owner.name || t.owner.email, t.derived.status)
  }
  for (const s of activeSubtasks) {
    bumpOwnerStatus(s.owner.id, s.owner.name || s.owner.email, s.status)
  }
  const byOwnerStatus = Array.from(byOwnerStatusMap.values())

  // Task per cliente: solo i primi 10 per numero di task, ordinati
  // decrescente, altrimenti con molti clienti il grafico diventa illeggibile.
  const byClientMap = new Map<string, { name: string; total: number }>()
  for (const t of enriched) {
    const key = t.client?.name || 'Senza cliente'
    const cur = byClientMap.get(key) || { name: key, total: 0 }
    cur.total += 1
    byClientMap.set(key, cur)
  }
  const byClientAll = Array.from(byClientMap.values()).sort((a, b) => b.total - a.total)
  const byClient = byClientAll.slice(0, 10)
  const byClientTruncated = byClientAll.length > 10

  return NextResponse.json({
    kpi: {
      totalTasks: totalTasksAll,
      completed,
      inProgress,
      notStarted,
      cancelled,
      overdue,
      completionRate: totalTasksAll > 0 ? Math.round((completed / totalTasksAll) * 100) : 0,
      totalSubtasks: totalSubtasksAll,
      completedSubtasks,
      subtaskCompletionRate:
        totalSubtasksAll > 0 ? Math.round((completedSubtasks / totalSubtasksAll) * 100) : 0
    },
    byOwner,
    byOwnerStatus,
    byClient,
    byClientTruncated,
    statusDistribution,
    teamScope
  })
}
