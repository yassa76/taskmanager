import { prisma } from '@/lib/prisma'

/**
 * Dopo la creazione o la modifica di un sub-task aggiorna il task padre:
 * - scadenza: se il sub-task scade DOPO il task, la scadenza del task viene
 *   spostata a quella data (mai accorciata);
 * - stato: se il sub-task e' "in corso" e il task era fermo su "da avviare"
 *   in modo manuale, rimuove il blocco manuale cosi' il task passa a "in corso".
 * Non tocca i task chiusi o annullati manualmente.
 */
export async function syncTaskFromSubtask(
  taskId: string,
  subtask: { status: string; endDate: Date | null }
) {
  if (subtask.status === 'completato' || subtask.status === 'annullato') return

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return

  const override = task.statusOverride as string | null
  if (override === 'completato' || override === 'annullato') return

  const data: { endDate?: Date; statusOverride?: null } = {}

  if (subtask.endDate && (!task.endDate || subtask.endDate > task.endDate)) {
    data.endDate = subtask.endDate
  }
  if (subtask.status === 'in_corso' && override === 'da_avviare') {
    data.statusOverride = null
  }

  if (Object.keys(data).length > 0) {
    await prisma.task.update({ where: { id: taskId }, data })
  }
}
