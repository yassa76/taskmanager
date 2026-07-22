import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deriveTaskStatus } from '@/lib/taskStatus'
import type { TaskDTO } from '@/types'

function toTaskDTO(task: any): TaskDTO {
  const derived = deriveTaskStatus(
    task.subtasks.map((s: any) => s.status),
    task.closedManually
  )
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    startDate: task.startDate ? task.startDate.toISOString() : null,
    endDate: task.endDate ? task.endDate.toISOString() : null,
    owner: { id: task.owner.id, name: task.owner.name, email: task.owner.email },
    clientId: task.clientId,
    clientName: task.client?.name ?? null,
    projectName: task.project?.name ?? null,
    projectId: task.projectId,
    closedManually: task.closedManually,
    status: derived.status,
    pendingClosure: derived.pendingClosure,
    progress: derived.progress,
    subtasks: task.subtasks.map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate ? s.endDate.toISOString() : null,
      owner: { id: s.owner.id, name: s.owner.name, email: s.owner.email },
      taskId: s.taskId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    })),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      owner: true,
      client: true,
      project: true,
      subtasks: { include: { owner: true }, orderBy: { createdAt: 'asc' } }
    }
  })
  if (!task) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })

  return NextResponse.json(toTaskDTO(task))
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json()
  const { title, description, startDate, endDate, ownerId, clientId, projectId } = body

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      ...(ownerId !== undefined ? { ownerId } : {}),
      ...(clientId !== undefined ? { clientId: clientId || null } : {}),
      ...(projectId !== undefined ? { projectId: projectId || null } : {})
    },
    include: {
      owner: true,
      client: true,
      project: true,
      subtasks: { include: { owner: true }, orderBy: { createdAt: 'asc' } }
    }
  })

  return NextResponse.json(toTaskDTO(task))
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  await prisma.task.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
