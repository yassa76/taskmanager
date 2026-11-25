import { prisma } from './prisma'
import { logActivity } from './activityLog'
import { addInterval, isRecurrence, recurrenceLabel } from './recurrenceShared'
import { formatDate } from './formatDate'
import { syncTaskFromSubtask } from './taskSync'

/**
 * Se il sub-task e' ricorrente ed e' appena stato chiuso ("Completato"), crea il successivo
 * nello stesso task.
 * - le date si spostano partendo da quelle PREVISTE (non da quando e' stato chiuso), cosi' una
 *   chiusura in ritardo non fa slittare l'intera serie;
 * - nome, dettagli, owner e ricorrenza vengono copiati; il nuovo sub-task parte da "Da avviare";
 * - la serie si ferma se il sub-task e' annullato, se il task padre e' chiuso/annullato a mano
 *   oppure se la nuova scadenza supera "Ripeti fino al";
 * - se il successivo esiste gia' non ne crea un altro (vale anche con chiusure simultanee);
 * - se il nuovo sub-task scade dopo il task padre, la scadenza del padre si allunga (come per
 *   ogni sub-task nuovo).
 * Ritorna il nuovo sub-task, oppure null se non ne e' stato creato uno.
 */
export async function spawnNextSubtask(subtaskId: string, actorId: string | null) {
  const sub = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: true, recurrenceNext: { select: { id: true } } }
  })
  if (!sub || !isRecurrence(sub.recurrence)) return null
  if (sub.status !== 'completato') return null
  if (sub.recurrenceNext) return null

  const override = sub.task.statusOverride
  if (override === 'completato' || override === 'annullato') return null

  const nextEnd = addInterval(sub.endDate ?? new Date(), sub.recurrence)
  if (sub.recurrenceEndDate && nextEnd > sub.recurrenceEndDate) return null
  const nextStart = addInterval(sub.startDate, sub.recurrence)

  try {
    const next = await prisma.subtask.create({
      data: {
        title: sub.title,
        description: sub.description,
        status: 'da_avviare',
        startDate: nextStart,
        endDate: nextEnd,
        ownerId: sub.ownerId,
        taskId: sub.taskId,
        createdById: sub.createdById,
        recurrence: sub.recurrence,
        recurrenceEndDate: sub.recurrenceEndDate,
        recurrenceSourceId: sub.id
      }
    })
    await logActivity({
      entityType: 'subtask',
      entityId: next.id,
      action: 'creato',
      entityLabel: next.title,
      detail: `Creato automaticamente (${recurrenceLabel(sub.recurrence).toLowerCase()}), scadenza ${formatDate(nextEnd.toISOString())}`,
      userId: actorId
    })
    if (actorId) await syncTaskFromSubtask(sub.taskId, next, actorId)
    return next
  } catch (e: any) {
    // P2002 = violazione dell'indice univoco: un altro processo l'ha gia' creato
    if (e?.code !== 'P2002') console.error('Errore nella creazione del sub-task ricorrente:', e)
    return null
  }
}
