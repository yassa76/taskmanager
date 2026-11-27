import { scopeIn, type ActionKey, type ObjectKey, type PermissionMap } from './permissionsShared'

// Sottoviste: la barra che compare subito sotto il menu principale. Per aggiungerne una basta una riga qui sotto.
// Una voce con `perm` compare solo a chi puo' "Visualizzare" quell'entita'.

export interface SubNavItem {
  id: string
  label: string
  href: string
  perm?: [ObjectKey, ActionKey]
  /** mostra il totale delle notifiche tra parentesi e il marker "N nuove" */
  badge?: 'notifications'
  active: (pathname: string, tab: string | null) => boolean
}

export interface SubNavSection {
  id: string
  applies: (pathname: string) => boolean
  /** se nessuna voce risulta attiva (es. /settings senza ?tab), si evidenzia la prima */
  fallbackFirst?: boolean
  items: SubNavItem[]
}

const adminItem = (id: string, label: string, obj: ObjectKey): SubNavItem => ({
  id,
  label,
  href: `/settings?tab=${id}`,
  perm: [obj, 'read'],
  active: (_p, tab) => tab === id
})

export const ADMIN_ITEMS: SubNavItem[] = [
  adminItem('profili', 'Profili e permessi', 'profiles'),
  adminItem('ruoli', 'Ruoli e visibilità', 'orgroles'),
  adminItem('paesi', 'Paesi dei clienti', 'countries'),
  adminItem('indirizzi', 'Verifica indirizzi', 'geocode'),
  adminItem('registro', 'Registro modifiche', 'activitylog'),
  adminItem('accessi', 'Registro accessi', 'accesslog')
]

export const SUBNAV: SubNavSection[] = [
  {
    id: 'account',
    applies: (p) => p.startsWith('/profile'),
    fallbackFirst: true,
    items: [
      { id: 'preferenze', label: 'Preferenze personali', href: '/profile?tab=preferenze', active: (_p, tab) => tab === 'preferenze' },
      { id: 'notifiche', label: 'Notifiche', href: '/profile?tab=notifiche', badge: 'notifications', active: (_p, tab) => tab === 'notifiche' }
    ]
  },
  {
    id: 'admin',
    applies: (p) => p.startsWith('/settings'),
    fallbackFirst: true,
    items: ADMIN_ITEMS
  },
  {
    id: 'tasks',
    applies: (p) => p.startsWith('/tasks') || p.startsWith('/subtasks'),
    items: [
      { id: 'tasks', label: 'Task', href: '/tasks', active: (p) => p.startsWith('/tasks') },
      { id: 'subtasks', label: 'Sub-task', href: '/subtasks', active: (p) => p.startsWith('/subtasks') }
    ]
  }
]

export function visibleItems(items: SubNavItem[], perms: PermissionMap | undefined | null): SubNavItem[] {
  return items.filter((i) => !i.perm || scopeIn(perms, i.perm[0], i.perm[1]) !== 'none')
}

export function subnavFor(pathname: string | null, perms: PermissionMap | undefined | null, tab: string | null) {
  const section = SUBNAV.find((s) => s.applies(pathname || ''))
  if (!section) return null
  const items = visibleItems(section.items, perms)
  if (items.length === 0) return null
  let activeId = items.find((i) => i.active(pathname || '', tab))?.id
  if (!activeId && section.fallbackFirst) activeId = items[0].id
  return { items, activeId }
}
