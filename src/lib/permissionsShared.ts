// Permessi dei ruoli: condivisi tra server e browser (nessun import del database qui).

export type Scope = 'none' | 'own' | 'all'
export type ActionKey = 'create' | 'update' | 'delete' | 'manage'
export type ObjectKey = 'task' | 'subtask' | 'client' | 'comment' | 'notification' | 'team' | 'settings' | 'profiles'
export type PermissionMap = Record<ObjectKey, Partial<Record<ActionKey, Scope>>>

export const ACTION_LABELS: Record<ActionKey, string> = {
  create: 'Creare',
  update: 'Modificare',
  delete: 'Eliminare',
  manage: 'Gestire'
}

// Oggetti del sistema e azioni che per ciascuno hanno senso, con i valori ammessi.
export const OBJECT_DEFS: {
  key: ObjectKey
  label: string
  hint?: string
  actions: Partial<Record<ActionKey, Scope[]>>
}[] = [
  {
    key: 'task',
    label: 'Task',
    hint: '"Solo i miei" = quelli di cui la persona è owner',
    actions: { create: ['none', 'all'], update: ['none', 'own', 'all'], delete: ['none', 'own', 'all'] }
  },
  {
    key: 'subtask',
    label: 'Sub-task',
    hint: '"Solo i miei" = di cui è owner, creatore o owner del task padre',
    actions: { create: ['none', 'all'], update: ['none', 'own', 'all'], delete: ['none', 'own', 'all'] }
  },
  {
    key: 'client',
    label: 'Clienti',
    actions: { create: ['none', 'all'], update: ['none', 'own', 'all'], delete: ['none', 'own', 'all'] }
  },
  {
    key: 'comment',
    label: 'Commenti',
    hint: '"Solo i miei" = scritti dalla persona stessa',
    actions: { create: ['none', 'all'], update: ['none', 'own'], delete: ['none', 'own', 'all'] }
  },
  {
    key: 'notification',
    label: 'Notifiche',
    hint: 'Eliminare le proprie notifiche',
    actions: { delete: ['none', 'all'] }
  },
  {
    key: 'team',
    label: 'Team',
    hint: 'Invitare persone, approvare accessi, cambiare profilo e stato',
    actions: { manage: ['none', 'all'] }
  },
  {
    key: 'settings',
    label: 'Impostazioni Admin',
    hint: 'Paesi, verifica indirizzi, registro modifiche e accessi',
    actions: { manage: ['none', 'all'] }
  },
  {
    key: 'profiles',
    label: 'Profili e ruoli',
    hint: 'Creare e modificare profili e permessi',
    actions: { manage: ['none', 'all'] }
  }
]

export const SCOPE_LABELS: Record<Scope, string> = { none: 'No', own: 'Solo i miei', all: 'Tutti' }

const full = { create: 'all', update: 'all', delete: 'all' } as const
const mine = { create: 'all', update: 'own', delete: 'own' } as const
const nothing = { create: 'none', update: 'none', delete: 'none' } as const

// Ruoli di sistema: riproducono le regole che c'erano prima dei ruoli personalizzati.
export const SYSTEM_ROLE_DEFAULTS: Record<string, PermissionMap> = {
  admin: {
    task: { ...full },
    subtask: { ...full },
    client: { ...full },
    comment: { create: 'all', update: 'own', delete: 'all' },
    notification: { delete: 'all' },
    team: { manage: 'all' },
    settings: { manage: 'all' },
    profiles: { manage: 'all' }
  },
  normal: {
    task: { ...mine },
    subtask: { ...mine },
    client: { ...mine },
    comment: { ...mine },
    notification: { delete: 'none' },
    team: { manage: 'none' },
    settings: { manage: 'none' },
    profiles: { manage: 'none' }
  },
  read_only: {
    task: { ...nothing },
    subtask: { ...nothing },
    client: { ...nothing },
    comment: { ...mine },
    notification: { delete: 'none' },
    team: { manage: 'none' },
    settings: { manage: 'none' },
    profiles: { manage: 'none' }
  }
}

export const SYSTEM_ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Accesso completo e gestione del sistema',
  normal: 'Crea; modifica ed elimina solo i propri record',
  read_only: 'Solo consultazione (può commentare)'
}

export const SYSTEM_ROLE_NAMES: Record<string, string> = {
  admin: 'Admin',
  normal: 'Normale',
  read_only: 'Sola lettura'
}

// Pulisce una mappa ricevuta (dal database o dal browser): tiene solo oggetti, azioni e valori ammessi;
// quello che manca si completa con "No".
export function sanitizePermissions(input: unknown): PermissionMap {
  const src = input && typeof input === 'object' ? (input as Record<string, any>) : {}
  const out = {} as PermissionMap
  for (const o of OBJECT_DEFS) {
    const row: Partial<Record<ActionKey, Scope>> = {}
    for (const [action, allowed] of Object.entries(o.actions) as [ActionKey, Scope[]][]) {
      const v = src[o.key]?.[action]
      row[action] = allowed.includes(v) ? v : 'none'
    }
    out[o.key] = row
  }
  return out
}

export function permissionsFor(roleKey: string | undefined | null): PermissionMap {
  return sanitizePermissions(SYSTEM_ROLE_DEFAULTS[roleKey || 'normal'] ?? SYSTEM_ROLE_DEFAULTS.normal)
}

export function scopeIn(perms: PermissionMap | undefined | null, obj: ObjectKey, action: ActionKey): Scope {
  return perms?.[obj]?.[action] ?? 'none'
}

// "Sola lettura" in pratica: nessuna creazione, modifica o eliminazione su task, sub-task e clienti.
export function isReadOnlyPerms(perms: PermissionMap | undefined | null): boolean {
  if (!perms) return false
  return (['task', 'subtask', 'client'] as ObjectKey[]).every((o) =>
    (['create', 'update', 'delete'] as ActionKey[]).every((a) => scopeIn(perms, o, a) === 'none')
  )
}
