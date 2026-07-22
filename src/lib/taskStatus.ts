export type SubtaskStatus = 'da_avviare' | 'in_corso' | 'completato'
export type DerivedStatus = 'da_avviare' | 'in_corso' | 'completato'

export interface DerivedTaskStatus {
  status: DerivedStatus
  // true quando tutti i figli sono completati ma il padre non e' ancora
  // stato chiuso esplicitamente: il frontend deve proporre la conferma.
  pendingClosure: boolean
  progress: number // 0-100, percentuale sotto-task completati
}

/**
 * Deriva lo stato del task padre a partire dallo stato dei sotto-task,
 * secondo le regole:
 * - nessun sotto-task -> "da_avviare"
 * - almeno un sotto-task "in_corso" -> "in_corso"
 * - tutti i sotto-task "da_avviare" -> "da_avviare"
 * - misto (alcuni completati, alcuni da avviare, nessuno in corso) -> "in_corso"
 * - tutti "completato":
 *      - se closedManually === true -> "completato"
 *      - altrimenti resta "in_corso" con pendingClosure = true, cosi' il
 *        frontend puo' chiedere conferma prima di chiudere il padre.
 */
export function deriveTaskStatus(
  subtaskStatuses: SubtaskStatus[],
  closedManually: boolean
): DerivedTaskStatus {
  const total = subtaskStatuses.length

  if (total === 0) {
    return { status: 'da_avviare', pendingClosure: false, progress: 0 }
  }

  const completedCount = subtaskStatuses.filter((s) => s === 'completato').length
  const inProgressCount = subtaskStatuses.filter((s) => s === 'in_corso').length
  const notStartedCount = subtaskStatuses.filter((s) => s === 'da_avviare').length
  const progress = Math.round((completedCount / total) * 100)

  if (completedCount === total) {
    if (closedManually) {
      return { status: 'completato', pendingClosure: false, progress: 100 }
    }
    return { status: 'in_corso', pendingClosure: true, progress }
  }

  if (inProgressCount > 0) {
    return { status: 'in_corso', pendingClosure: false, progress }
  }

  if (notStartedCount === total) {
    return { status: 'da_avviare', pendingClosure: false, progress: 0 }
  }

  // Misto: alcuni completati, alcuni da avviare, nessuno in corso
  return { status: 'in_corso', pendingClosure: false, progress }
}

export const STATUS_LABELS: Record<DerivedStatus, string> = {
  da_avviare: 'Da avviare',
  in_corso: 'In corso',
  completato: 'Completato'
}

export const STATUS_COLORS: Record<DerivedStatus, string> = {
  da_avviare: 'bg-gray-200 text-gray-700',
  in_corso: 'bg-amber-100 text-amber-800',
  completato: 'bg-emerald-100 text-emerald-800'
}
