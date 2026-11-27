// Opzioni di visibilita' dei ruoli aziendali (condivise tra server e browser).

export type TaskVisibility = 'own' | 'own_and_below' | 'all'
export type ClientVisibility = 'all' | 'related'

export const TASK_VISIBILITY_LABELS: Record<TaskVisibility, string> = {
  own: 'Solo i propri',
  own_and_below: 'I propri e quelli dei ruoli sottostanti',
  all: 'Tutti'
}

export const CLIENT_VISIBILITY_LABELS: Record<ClientVisibility, string> = {
  all: 'Tutti i clienti',
  related: 'Solo i clienti dove ha task o che possiede'
}

export function isTaskVisibility(v: unknown): v is TaskVisibility {
  return v === 'own' || v === 'own_and_below' || v === 'all'
}
export function isClientVisibility(v: unknown): v is ClientVisibility {
  return v === 'all' || v === 'related'
}
