import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVisibility, canSeeTask, type Visibility, canSeeSubtask } from '@/lib/visibility'
import { deriveTaskStatus } from '@/lib/taskStatus'
import { canEditRecord, canDeleteRecord } from '@/lib/permissions'
import { logActivity } from '@/lib/activityLog'
import { notifyUser, actorName, assignedMessage, deadlineChangedMessage } from '@/lib/notify'
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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const vis = await getVisibility(session)
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      owner: true,
      createdBy: true,
      client: true,
      project: true,
      subtasks: { include: { owner: true, createdBy: true }, orderBy: { createdAt: 'asc' } }
    }
  })
  if (!task || !(await canSeeTask(vis, params.id))) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })

  return NextResponse.json(toTaskDTO(task, vis))
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const existing = await prisma.task.findUnique({ where: { id: params.id }, include: { owner: true } })
  if (!existing || !(await canSeeTask(await getVisibility(session), params.id))) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
  if (!canEditRecord(session, existing.ownerId)) {
    return NextResponse.json({ error: 'Non hai i permessi per modificare questo task' }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, startDate, endDate, ownerId, clientId, projectId, status } = body

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      ...(ownerId !== undefined ? { ownerId } : {}),
      ...(clientId !== undefined ? { clientId: clientId || null } : {}),
      ...(projectId !== undefined ? { projectId: projectId || null } : {}),
      // status: 'auto' (o vuoto) rimuove il forzaggio manuale e torna alla
      // derivazione automatica in base ai sotto-task.
      ...(status !== undefined ? { statusOverride: status && status !== 'auto' ? status : null } : {})
    },
    include: {
      owner: true,
      createdBy: true,
      client: true,
      project: true,
      subtasks: { include: { owner: true, createdBy: true }, orderBy: { createdAt: 'asc' } }
    }
  })

  const actorId = (session.user as any).id

  if (status !== undefined && status !== existing.statusOverride) {
    await logActivity({
      entityType: 'task',
      entityId: task.id,
      action: 'stato',
      entityLabel: task.title,
      detail: `${existing.statusOverride || 'Automatico'} → ${status || 'Automatico'}`,
      userId: actorId
    })
  }

  if (ownerId !== undefined && ownerId !== existing.ownerId) {
    await logActivity({
      entityType: 'task',
      entityId: task.id,
      action: 'owner',
      entityLabel: task.title,
      detail: `${existing.owner.name || existing.owner.email} → ${task.owner.name || task.owner.email}`,
      userId: actorId
    })
  }

  // Avvisi: nuovo owner e cambio di scadenza (fatti da un altro)
  const ownerChanged = ownerId !== undefined && ownerId !== existing.ownerId
  const newEnd = endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined
  const endChanged = newEnd !== undefined && (newEnd?.getTime() ?? null) !== (existing.endDate?.getTime() ?? null)
  if (ownerChanged || endChanged) {
    const who = await actorName(actorId)
    if (ownerChanged) {
      await notifyUser({
        userId: task.ownerId,
        actorId,
        reason: 'assegnato',
        entityType: 'task',
        entityId: task.id,
        message: assignedMessage(who, 'task', task.title)
      })
    }
    if (endChanged && !ownerChanged) {
      await notifyUser({
        userId: task.ownerId,
        actorId,
        reason: 'scadenza_cambiata',
        entityType: 'task',
        entityId: task.id,
        message: deadlineChangedMessage(who, 'task', task.title, existing.endDate, newEnd ?? null),
        mergeRecent: true
      })
    }
  }

  return NextResponse.json(toTaskDTO(task))
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const existing = await prisma.task.findUnique({ where: { id: params.id }, include: { _count: { select: { subtasks: true } } } })
  if (!existing || !(await canSeeTask(await getVisibility(session), params.id))) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
  if (!canDeleteRecord(session, existing.ownerId)) {
    return NextResponse.json({ error: 'Non hai i permessi per eliminare questo task' }, { status: 403 })
  }

  if (existing._count.subtasks > 0) {
    return NextResponse.json(
      {
        error: `Non puoi eliminare questo task: ha ${existing._count.subtasks} sotto-task (anche completati o annullati). Imposta lo stato del task su "Annullato" invece, per non perdere lo storico.`
      },
      { status: 409 }
    )
  }

  await logActivity({
    entityType: 'task',
    entityId: existing.id,
    action: 'eliminato',
    entityLabel: existing.title,
    userId: (session.user as any).id
  })

  await prisma.task.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
