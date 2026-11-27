import { notifyUser, actorName, assignedMessage } from '@/lib/notify'
import { isRecurrence } from '@/lib/recurrenceShared'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVisibility, taskWhere as visTaskWhere, canSeeSubtask, type Visibility } from '@/lib/visibility'
import { deriveTaskStatus } from '@/lib/taskStatus'
import { canCreate } from '@/lib/permissions'
import { logActivity } from '@/lib/activityLog'
import type { TaskDTO } from '@/types'

function toTaskDTO(task: any, vis?: Visibility): TaskDTO {
  const derived = deriveTaskStatus(
    task.subtasks.map((s: any) => s.status),
    task.closedManually,
    task.statusOverride
  )
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    startDate: task.startDate ? task.startDate.toISOString() : null,
    endDate: task.endDate ? task.endDate.toISOString() : null,
    owner: { id: task.owner.id, name: task.owner.name, email: task.owner.email },
    createdBy: task.createdBy ? { id: task.createdBy.id, name: task.createdBy.name, email: task.createdBy.email } : null,
    clientId: task.clientId,
    clientName: task.client?.name ?? null,
    projectName: task.project?.name ?? null,
    projectId: task.projectId,
    closedManually: task.closedManually,
    statusOverride: task.statusOverride,
    status: derived.status,
    pendingClosure: derived.pendingClosure,
    progress: derived.progress,
    // lo stato si calcola su tutti i sub-task; l'elenco mostra solo quelli che la persona puo' vedere
    subtasks: task.subtasks.filter((s: any) => !vis || canSeeSubtask(vis, s, task.ownerId)).map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate ? s.endDate.toISOString() : null,
      closedAt: s.closedAt ? s.closedAt.toISOString() : null,
      owner: { id: s.owner.id, name: s.owner.name, email: s.owner.email },
      createdBy: s.createdBy ? { id: s.createdBy.id, name: s.createdBy.name, email: s.createdBy.email } : null,
      taskId: s.taskId,
      recurrence: s.recurrence ?? null,
      recurrenceEndDate: s.recurrenceEndDate ? s.recurrenceEndDate.toISOString() : null,
      recurrenceSourceId: s.recurrenceSourceId ?? null,
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

  const vis = await getVisibility(session)
  const tasks = await prisma.task.findMany({
    where: {
      AND: [visTaskWhere(vis)],
      ...(mine ? { ownerId: (session.user as any).id } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(clientId ? { clientId } : {}),
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
      createdBy: true,
      client: true,
      project: true,
      subtasks: { include: { owner: true, createdBy: true } }
    },
    orderBy: { updatedAt: 'desc' }
  })

  let dtos = tasks.map((t) => toTaskDTO(t, vis))

  if (status) {
    dtos = dtos.filter((t) => t.status === status)
  }

  return NextResponse.json(dtos)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canCreate(session)) return NextResponse.json({ error: 'Utente in sola lettura' }, { status: 403 })

  const body = await req.json()
  const { title, description, startDate, endDate, ownerId, clientId, projectId, subtasks } = body

  if (!title || !ownerId) {
    return NextResponse.json({ error: 'Titolo e owner sono obbligatori' }, { status: 400 })
  }
  if (!endDate) {
    return NextResponse.json({ error: 'La data di scadenza è obbligatoria' }, { status: 400 })
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      ownerId,
      clientId: clientId || null,
      projectId: projectId || null,
      createdById: (session.user as any).id,
      subtasks: {
        create: (subtasks || []).map((s: any) => ({
          title: s.title,
          ownerId: s.ownerId || ownerId,
          status: s.status || 'da_avviare',
          endDate: s.endDate ? new Date(s.endDate) : null,
          recurrence: s.recurrence && isRecurrence(s.recurrence) ? s.recurrence : null,
          recurrenceEndDate:
            s.recurrence && isRecurrence(s.recurrence) && s.recurrenceEndDate ? new Date(s.recurrenceEndDate) : null,
          createdById: (session.user as any).id
        }))
      }
    },
    include: {
      owner: true,
      createdBy: true,
      client: true,
      project: true,
      subtasks: { include: { owner: true, createdBy: true } }
    }
  })

  await logActivity({
    entityType: 'task',
    entityId: task.id,
    action: 'creato',
    entityLabel: task.title,
    userId: (session.user as any).id
  })
  for (const s of task.subtasks) {
    await logActivity({
      entityType: 'subtask',
      entityId: s.id,
      action: 'creato',
      entityLabel: s.title,
      userId: (session.user as any).id
    })
  }

  const creatorId = (session.user as any).id
  const creatorName = await actorName(creatorId)
  await notifyUser({
    userId: task.ownerId,
    actorId: creatorId,
    reason: 'assegnato',
    entityType: 'task',
    entityId: task.id,
    message: assignedMessage(creatorName, 'task', task.title)
  })
  for (const s of task.subtasks) {
    if (s.ownerId === task.ownerId) continue // chi e' gia' avvisato per il task non riceve un secondo avviso
    await notifyUser({
      userId: s.ownerId,
      actorId: creatorId,
      reason: 'assegnato',
      entityType: 'subtask',
      entityId: s.id,
      message: assignedMessage(creatorName, 'subtask', s.title)
    })
  }

  return NextResponse.json(toTaskDTO(task), { status: 201 })
}
