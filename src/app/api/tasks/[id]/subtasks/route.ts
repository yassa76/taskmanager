import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEditRecord } from '@/lib/permissions'
import { logActivity } from '@/lib/activityLog'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const task = await prisma.task.findUnique({ where: { id: params.id } })
  if (!task) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
  if (!canEditRecord(session, task.ownerId)) {
    return NextResponse.json({ error: 'Non hai i permessi per aggiungere sub-task a questo task' }, { status: 403 })
  }

  const body = await req.json()
  const { title, ownerId, status, startDate, endDate, description } = body

  if (!title) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 })
  if (!endDate) return NextResponse.json({ error: 'La data di scadenza è obbligatoria' }, { status: 400 })

  const subtask = await prisma.subtask.create({
    data: {
      title,
      description: description || null,
      status: status || 'da_avviare',
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      endDate: endDate ? new Date(endDate) : null,
      ownerId: ownerId || task.ownerId, // default: owner del task padre
      taskId: task.id,
      createdById: (session.user as any).id
    },
    include: { owner: true, createdBy: true }
  })

  // Se il padre era chiuso manualmente e si aggiunge un nuovo sotto-task,
  // riapriamo il padre (non ha piu' senso restare "completato").
  if (task.closedManually) {
    await prisma.task.update({ where: { id: task.id }, data: { closedManually: false } })
  }

  await logActivity({
    entityType: 'subtask',
    entityId: subtask.id,
    action: 'creato',
    entityLabel: subtask.title,
    userId: (session.user as any).id
  })

  return NextResponse.json(subtask, { status: 201 })
}
