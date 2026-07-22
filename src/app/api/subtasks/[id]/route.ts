import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deriveTaskStatus } from '@/lib/taskStatus'
import type { SubtaskDetailDTO } from '@/types'

function toSubtaskDetailDTO(subtask: any): SubtaskDetailDTO {
  return {
    id: subtask.id,
    title: subtask.title,
    description: subtask.description,
    status: subtask.status,
    startDate: subtask.startDate.toISOString(),
    endDate: subtask.endDate ? subtask.endDate.toISOString() : null,
    owner: { id: subtask.owner.id, name: subtask.owner.name, email: subtask.owner.email },
    taskId: subtask.taskId,
    createdAt: subtask.createdAt.toISOString(),
    updatedAt: subtask.updatedAt.toISOString(),
    task: {
      id: subtask.task.id,
      title: subtask.task.title,
      clientId: subtask.task.clientId,
      clientName: subtask.task.client?.name ?? null
    }
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const subtask = await prisma.subtask.findUnique({
    where: { id: params.id },
    include: { owner: true, task: { include: { client: true } } }
  })
  if (!subtask) return NextResponse.json({ error: 'Sub-task non trovato' }, { status: 404 })

  return NextResponse.json(toSubtaskDetailDTO(subtask))
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json()
  const { title, description, status, ownerId, startDate, endDate } = body

  const subtask = await prisma.subtask.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(ownerId !== undefined ? { ownerId } : {}),
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : new Date() } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {})
    },
    include: { owner: true, task: { include: { subtasks: true, client: true } } }
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
    subtask: toSubtaskDetailDTO(subtask),
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
