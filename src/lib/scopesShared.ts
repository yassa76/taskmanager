// Viste standard dei record (condivise tra server e browser).

export type ViewScope = 'mine' | 'team' | 'all'

export const SCOPE_LABELS: Record<ViewScope, string> = {
  mine: 'I miei record',
  team: 'Del mio team',
  all: 'Tutti'
}

export function isViewScope(v: unknown): v is ViewScope {
  return v === 'mine' || v === 'team' || v === 'all'
}
