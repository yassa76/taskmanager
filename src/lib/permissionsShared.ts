// Permessi dei ruoli: condivisi tra server e browser (nessun import del database qui).

export type Scope = 'none' | 'own' | 'all'
export type ActionKey = 'read' | 'create' | 'update' | 'delete'
export type ObjectKey =
  | 'task'
  | 'subtask'
  | 'client'
  | 'comment'
  | 'notification'
  | 'team'
  | 'countries'
  | 'geocode'
  | 'activitylog'
  | 'accesslog'
  | 'profiles'
  | 'orgroles'
export type PermissionMap = Record<ObjectKey, Partial<Record<ActionKey, Scope>>>

export const ACTION_LABELS: Record<ActionKey, string> = {
  read: 'Visualizzare',
  create: 'Creare',
  update: 'Modificare',
  delete: 'Eliminare'
}

export const ACTIONS: ActionKey[] = ['read', 'create', 'update', 'delete']

export const GROUP_LABELS = { data: 'Dati', admin: 'Amministrazione' } as const
export type GroupKey = keyof typeof GROUP_LABELS

const YN: Scope[] = ['none', 'all']
const YON: Scope[] = ['none', 'own', 'all']

// Entita' del sistema e azioni che per ciascuna hanno senso, con i valori ammessi.
// Per aggiungere un'entita' basta una riga qui: la matrice e i controlli la raccolgono da soli.
// Nelle entita' di amministrazione "Visualizzare" decide anche se la sezione compare.
export const OBJECT_DEFS: {
  key: ObjectKey
  group: GroupKey
  label: string
  hint?: string
  actions: Partial<Record<ActionKey, Scope[]>>
}[] = [
  {
    key: 'task',
    group: 'data',
    label: 'Task',
    hint: '"Solo i miei" = quelli di cui la persona è owner',
    actions: { create: YN, update: YON, delete: YON }
  },
  {
    key: 'subtask',
    group: 'data',
    label: 'Sub-task',
    hint: '"Solo i miei" = di cui è owner, creatore o owner del task padre',
    actions: { create: YN, update: YON, delete: YON }
  },
  { key: 'client', group: 'data', label: 'Clienti', actions: { create: YN, update: YON, delete: YON } },
  {
    key: 'comment',
    group: 'data',
    label: 'Commenti',
    hint: '"Solo i miei" = scritti dalla persona stessa',
    actions: { create: YN, update: ['none', 'own'], delete: YON }
  },
  { key: 'notification', group: 'data', label: 'Notifiche', hint: 'Eliminare le proprie notifiche', actions: { delete: YN } },
  {
    key: 'team',
    group: 'admin',
    label: 'Team',
    hint: 'Creare = invitare; Modificare = profilo, ruolo, stato, approvazioni',
    actions: { read: YN, create: YN, update: YN, delete: YN }
  },
  { key: 'countries', group: 'admin', label: 'Paesi dei clienti', hint: 'Modificare = aggiungere o togliere paesi', actions: { read: YN, update: YN } },
  { key: 'geocode', group: 'admin', label: 'Verifica indirizzi', hint: 'Modificare = cambiare i limiti di utilizzo', actions: { read: YN, update: YN } },
  { key: 'activitylog', group: 'admin', label: 'Registro modifiche', hint: 'Modificare = cambiare per quanto tempo si conserva (le voci più vecchie si cancellano da sole)', actions: { read: YN, update: YN } },
  { key: 'accesslog', group: 'admin', label: 'Registro accessi', hint: 'Modificare = cambiare per quanto tempo si conserva (le voci più vecchie si cancellano da sole)', actions: { read: YN, update: YN } },
  { key: 'profiles', group: 'admin', label: 'Profili e permessi', hint: 'Modificare = anche scegliere il profilo predefinito', actions: { read: YN, create: YN, update: YN, delete: YN } },
  { key: 'orgroles', group: 'admin', label: 'Ruoli e visibilità', hint: 'Modificare = anche scegliere il ruolo predefinito', actions: { read: YN, create: YN, update: YN, delete: YN } }
]

export const SCOPE_LABELS: Record<Scope, string> = { none: 'No', own: 'Solo i miei', all: 'Tutti' }

const full = { create: 'all', update: 'all', delete: 'all' } as const
const mine = { create: 'all', update: 'own', delete: 'own' } as const
const nothing = { create: 'none', update: 'none', delete: 'none' } as const

// Entita' di amministrazione: tutto aperto o tutto chiuso.
const ADMIN_KEYS: ObjectKey[] = ['team', 'countries', 'geocode', 'activitylog', 'accesslog', 'profiles', 'orgroles']
function adminSet(v: Scope): Partial<PermissionMap> {
  const out: Partial<PermissionMap> = {}
  for (const k of ADMIN_KEYS) {
    const def = OBJECT_DEFS.find((o) => o.key === k)!
    out[k] = Object.fromEntries(Object.keys(def.actions).map((a) => [a, v])) as Partial<Record<ActionKey, Scope>>
  }
  return out
}

// Ruoli di sistema: riproducono le regole che c'erano prima dei profili personalizzati.
export const SYSTEM_ROLE_DEFAULTS: Record<string, PermissionMap> = {
  admin: {
    task: { ...full },
    subtask: { ...full },
    client: { ...full },
    comment: { create: 'all', update: 'own', delete: 'all' },
    notification: { delete: 'all' },
    ...adminSet('all')
  } as PermissionMap,
  normal: {
    task: { ...mine },
    subtask: { ...mine },
    client: { ...mine },
    comment: { ...mine },
    notification: { delete: 'none' },
    ...adminSet('none'),
    team: { read: 'all', create: 'none', update: 'none', delete: 'none' }
  } as PermissionMap,
  read_only: {
    task: { ...nothing },
    subtask: { ...nothing },
    client: { ...nothing },
    comment: { ...mine },
    notification: { delete: 'none' },
    ...adminSet('none'),
    team: { read: 'all', create: 'none', update: 'none', delete: 'none' }
  } as PermissionMap
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

// Vecchio formato: un unico permesso "manage" per Team, "settings" e "profiles".
// Chi lo aveva attivo ottiene tutte le azioni delle entita' corrispondenti.
const LEGACY: Record<string, ObjectKey[]> = {
  team: ['team'],
  settings: ['countries', 'geocode', 'activitylog', 'accesslog'],
  profiles: ['profiles', 'orgroles']
}

function legacyOn(src: Record<string, any>, key: ObjectKey): boolean {
  for (const [old, targets] of Object.entries(LEGACY)) {
    if (targets.includes(key) && src[old]?.manage === 'all') return true
  }
  return false
}

// Pulisce una mappa ricevuta (dal database o dal browser): tiene solo oggetti, azioni e valori ammessi;
// quello che manca si completa con "No". Nelle entita' di amministrazione, senza "Visualizzare" le altre azioni cadono.
export function sanitizePermissions(input: unknown): PermissionMap {
  const src = input && typeof input === 'object' ? (input as Record<string, any>) : {}
  const out = {} as PermissionMap
  for (const o of OBJECT_DEFS) {
    const row: Partial<Record<ActionKey, Scope>> = {}
    const legacy = legacyOn(src, o.key)
    for (const [action, allowed] of Object.entries(o.actions) as [ActionKey, Scope[]][]) {
      const v = src[o.key]?.[action]
      // profili salvati prima di "Visualizzare": la pagina Team restava visibile a tutti, quindi resta "Si'"
      const keepTeamPage = o.key === 'team' && action === 'read' && v === undefined
      row[action] = allowed.includes(v) ? v : (legacy || keepTeamPage) && allowed.includes('all') ? 'all' : 'none'
    }
    if (o.actions.read && row.read === 'none') {
      for (const a of Object.keys(row) as ActionKey[]) row[a] = 'none'
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
