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
    clientName: task.project?.client?.name ?? null,
    projectName: task.project?.name ?? null,
    projectId: task.projectId,
    closedManually: task.closedManually,
    status: derived.status,
    pendingClosure: derived.pendingClosure,
    progress: derived.progress,
    subtasks: task.subtasks.map((s: any) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      owner: { id: s.owner.id, name: s.owner.name, email: s.owner.email },
      taskId: s.taskId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    })),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mine = searchParams.get('mine') === 'true'
  const ownerId = searchParams.get('ownerId')
  const clientId = searchParams.get('clientId')
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status') // filtro applicato dopo il calcolo (derivato)
  const search = searchParams.get('search')

  const tasks = await prisma.task.findMany({
    where: {
      ...(mine ? { ownerId: (session.user as any).id } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(clientId ? { project: { clientId } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    },
    include: {
      owner: true,
      project: { include: { client: true } },
      subtasks: { include: { owner: true } }
    },
    orderBy: { updatedAt: 'desc' }
  })

  let dtos = tasks.map(toTaskDTO)

  if (status) {
    dtos = dtos.filter((t) => t.status === status)
  }

  return NextResponse.json(dtos)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json()
  const { title, description, startDate, endDate, ownerId, projectId, subtasks } = body

  if (!title || !ownerId) {
    return NextResponse.json({ error: 'Titolo e owner sono obbligatori' }, { status: 400 })
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      ownerId,
      projectId: projectId || null,
      subtasks: {
        create: (subtasks || []).map((s: any) => ({
          title: s.title,
          ownerId: s.ownerId || ownerId,
          status: s.status || 'da_avviare'
        }))
      }
    },
    include: {
      owner: true,
      project: { include: { client: true } },
      subtasks: { include: { owner: true } }
    }
  })

  return NextResponse.json(toTaskDTO(task), { status: 201 })
}
