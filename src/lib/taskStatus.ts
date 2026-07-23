export type SubtaskStatus = 'da_avviare' | 'in_corso' | 'completato'
export type DerivedStatus = 'da_avviare' | 'in_corso' | 'completato'

export interface DerivedTaskStatus {
  status: DerivedStatus
  pendingClosure: boolean
  progress: number
}

export function deriveTaskStatus(
  subtaskStatuses: string[],
  closedManually: boolean,
  statusOverride?: string | null
): DerivedTaskStatus {
  const total = subtaskStatuses.length
  const completedCount = subtaskStatuses.filter((s) => s === 'completato').length
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : statusOverride === 'completato' ? 100 : 0

  if (statusOverride === 'da_avviare' || statusOverride === 'in_corso' || statusOverride === 'completato') {
    return { status: statusOverride, pendingClosure: false, progress }
  }

  if (total === 0) {
    return { status: 'da_avviare', pendingClosure: false, progress: 0 }
  }

  const inProgressCount = subtaskStatuses.filter((s) => s === 'in_corso').length
  const notStartedCount = subtaskStatuses.filter((s) => s === 'da_avviare').length

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
