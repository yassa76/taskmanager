import { notifyUser, actorName, assignedMessage } from '@/lib/notify'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canCreate } from '@/lib/permissions'
import { logActivity } from '@/lib/activityLog'
import { syncTaskFromSubtask } from '@/lib/taskSync'
import { isRecurrence } from '@/lib/recurrenceShared'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const task = await prisma.task.findUnique({ where: { id: params.id } })
  if (!task) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
  if (!canCreate(session)) {
    return NextResponse.json({ error: 'Utente in sola lettura: non puoi aggiungere sub-task' }, { status: 403 })
  }

  const body = await req.json()
  const { title, ownerId, status, startDate, endDate, description, recurrence, recurrenceEndDate } = body

  if (!title) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 })
  if (!endDate) return NextResponse.json({ error: 'La data di scadenza è obbligatoria' }, { status: 400 })

  if (recurrence && !isRecurrence(recurrence)) {
    return NextResponse.json({ error: 'Ricorrenza non valida' }, { status: 400 })
  }

  const subtask = await prisma.subtask.create({
    data: {
      title,
      description: description || null,
      status: status || 'da_avviare',
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      endDate: endDate ? new Date(endDate) : null,
      ownerId: ownerId || task.ownerId, // default: owner del task padre
      taskId: task.id,
      recurrence: recurrence || null,
      recurrenceEndDate: recurrence && recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      createdById: (session.user as any).id
    },
    include: { owner: true, createdBy: true }
  })

  // Se il padre era chiuso manualmente e si aggiunge un nuovo sotto-task,
  // riapriamo il padre (non ha piu' senso restare "completato").
  if (task.closedManually) {
    await prisma.task.update({ where: { id: task.id }, data: { closedManually: false } })
  }
  
  await syncTaskFromSubtask(task.id, subtask, (session.user as any).id)
  
  await logActivity({
    entityType: 'subtask',
    entityId: subtask.id,
    action: 'creato',
    entityLabel: subtask.title,
    userId: (session.user as any).id
  })

  const creatorId = (session.user as any).id
  if (subtask.ownerId !== creatorId) {
    await notifyUser({
      userId: subtask.ownerId,
      actorId: creatorId,
      reason: 'assegnato',
      entityType: 'subtask',
      entityId: subtask.id,
      message: assignedMessage(await actorName(creatorId), 'subtask', subtask.title)
    })
  }

  return NextResponse.json(subtask, { status: 201 })
}
