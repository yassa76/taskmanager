import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLog'
import { formatDate } from '@/lib/formatDate'

/**
 * Dopo la creazione o la modifica di un sub-task aggiorna il task padre:
 * - scadenza: se il sub-task scade DOPO il task, la scadenza del task viene
 *   spostata a quella data (mai accorciata);
 * - stato: se il sub-task e' "in corso" e il task era fermo su "da avviare"
 *   in modo manuale, rimuove il blocco manuale cosi' il task passa a "in corso".
 * Non tocca i task chiusi o annullati manualmente. Ogni cambio finisce in cronologia.
 */
export async function syncTaskFromSubtask(
  taskId: string,
  subtask: { status: string; endDate: Date | null },
  userId: string
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

  if (Object.keys(data).length === 0) return

  await prisma.task.update({ where: { id: taskId }, data })

  if (data.endDate) {
    await logActivity({
      entityType: 'task',
      entityId: task.id,
      action: 'scadenza',
      entityLabel: task.title,
      detail: `${task.endDate ? formatDate(task.endDate.toISOString()) : '—'} → ${formatDate(
        data.endDate.toISOString()
      )} (automatico, da sub-task)`,
      userId
    })
  }
  if (data.statusOverride === null) {
    await logActivity({
      entityType: 'task',
      entityId: task.id,
      action: 'stato',
      entityLabel: task.title,
      detail: 'da_avviare → in_corso (automatico, sub-task in corso)',
      userId
    })
  }
}
