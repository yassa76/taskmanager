import { prisma } from './prisma'
import { deriveTaskStatus } from './taskStatus'
import { logActivity } from './activityLog'
import { addInterval, isRecurrence, recurrenceLabel } from './recurrenceShared'
import { formatDate } from './formatDate'

/**
 * Se il task e' ricorrente ed e' appena stato chiuso ("Completato"), crea il task successivo.
 * - le date si spostano partendo da quelle PREVISTE del task (non da quando e' stato chiuso),
 *   cosi' una chiusura in ritardo non fa slittare l'intera serie;
 * - titolo, descrizione, cliente, progetto, owner e ricorrenza vengono copiati; i sub-task no;
 * - la serie si ferma se il task e' annullato o se la nuova scadenza supera "Ripeti fino al";
 * - se il successivo esiste gia' non ne crea un altro (vale anche con chiusure simultanee).
 * Ritorna il nuovo task, oppure null se non ne e' stato creato uno.
 */
export async function spawnNextRecurrence(taskId: string, actorId: string | null) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { subtasks: { select: { status: true } }, recurrenceNext: { select: { id: true } } }
  })
  if (!task || !isRecurrence(task.recurrence)) return null
  if (task.recurrenceNext) return null

  const derived = deriveTaskStatus(
    task.subtasks.map((s) => s.status),
    task.closedManually,
    task.statusOverride
  )
  if (derived.status !== 'completato') return null

  const baseEnd = task.endDate ?? new Date()
  const nextEnd = addInterval(baseEnd, task.recurrence)
  if (task.recurrenceEndDate && nextEnd > task.recurrenceEndDate) return null
  const nextStart = task.startDate ? addInterval(task.startDate, task.recurrence) : null

  try {
    const next = await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        startDate: nextStart,
        endDate: nextEnd,
        ownerId: task.ownerId,
        clientId: task.clientId,
        projectId: task.projectId,
        createdById: task.createdById,
        recurrence: task.recurrence,
        recurrenceEndDate: task.recurrenceEndDate,
        recurrenceSourceId: task.id
      }
    })
    await logActivity({
      entityType: 'task',
      entityId: next.id,
      action: 'creato',
      entityLabel: next.title,
      detail: `Creato automaticamente (${recurrenceLabel(task.recurrence).toLowerCase()}), scadenza ${formatDate(nextEnd.toISOString())}`,
      userId: actorId
    })
    return next
  } catch (e: any) {
    // P2002 = violazione dell'indice univoco: un altro processo l'ha gia' creato
    if (e?.code !== 'P2002') console.error('Errore nella creazione del task ricorrente:', e)
    return null
  }
}
