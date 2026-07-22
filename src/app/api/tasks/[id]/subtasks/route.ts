import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const task = await prisma.task.findUnique({ where: { id: params.id } })
  if (!task) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })

  const body = await req.json()
  const { title, ownerId, status, startDate, endDate, description } = body

  if (!title) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 })

  const subtask = await prisma.subtask.create({
    data: {
      title,
      description: description || null,
      status: status || 'da_avviare',
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      endDate: endDate ? new Date(endDate) : null,
      ownerId: ownerId || task.ownerId, // default: owner del task padre
      taskId: task.id
    },
    include: { owner: true }
  })

  // Se il padre era chiuso manualmente e si aggiunge un nuovo sotto-task,
  // riapriamo il padre (non ha piu' senso restare "completato").
  if (task.closedManually) {
    await prisma.task.update({ where: { id: task.id }, data: { closedManually: false } })
  }

  return NextResponse.json(subtask, { status: 201 })
}
