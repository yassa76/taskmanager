import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deriveTaskStatus } from '@/lib/taskStatus'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json()
  const { title, status, ownerId } = body

  const subtask = await prisma.subtask.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(ownerId !== undefined ? { ownerId } : {})
    },
    include: { owner: true, task: { include: { subtasks: true } } }
  })

  // Se cambiando questo sotto-task NON tutti i fratelli sono piu' completati,
  // annulliamo un'eventuale chiusura manuale precedente del padre.
  const derived = deriveTaskStatus(
    subtask.task.subtasks.map((s) => s.status),
    subtask.task.closedManually
  )

  let pendingClosure = derived.pendingClosure

  if (subtask.task.closedManually && derived.status !== 'completato') {
    await prisma.task.update({ where: { id: subtask.task.id }, data: { closedManually: false } })
  }

  return NextResponse.json({
    subtask: { id: subtask.id, title: subtask.title, status: subtask.status, ownerId: subtask.ownerId },
    taskId: subtask.taskId,
    pendingClosure
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  await prisma.subtask.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
