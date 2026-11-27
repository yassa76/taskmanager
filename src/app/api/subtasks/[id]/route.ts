import { notifyUser, actorName, assignedMessage, deadlineChangedMessage } from '@/lib/notify'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deriveTaskStatus } from '@/lib/taskStatus'
import { scopeOf, getUserId } from '@/lib/permissions'
import { logActivity } from '@/lib/activityLog'
import type { SubtaskDetailDTO } from '@/types'
import { syncTaskFromSubtask } from '@/lib/taskSync'
import { isRecurrence } from '@/lib/recurrenceShared'
import { spawnNextSubtask } from '@/lib/recurrence'

// Puo' modificare/eliminare un sub-task secondo il ruolo: "Tutti" sempre; "Solo i miei" se e' owner del sub-task,
// owner del task padre oppure chi lo ha creato; "No" mai.
function canManageSubtask(
  session: any,
  subtask: { ownerId: string; createdById: string | null },
  taskOwnerId: string,
  action: 'update' | 'delete'
): boolean {
  const scope = scopeOf(session, 'subtask', action)
  if (scope === 'all') return true
  if (scope === 'none') return false
  const uid = getUserId(session)
  if (!uid) return false
  return subtask.ownerId === uid || taskOwnerId === uid || subtask.createdById === uid
}

function toSubtaskDetailDTO(subtask: any): SubtaskDetailDTO {
  return {
    id: subtask.id,
    title: subtask.title,
    description: subtask.description,
    status: subtask.status,
    startDate: subtask.startDate.toISOString(),
    endDate: subtask.endDate ? subtask.endDate.toISOString() : null,
    closedAt: subtask.closedAt ? subtask.closedAt.toISOString() : null,
    owner: { id: subtask.owner.id, name: subtask.owner.name, email: subtask.owner.email },
    createdBy: subtask.createdBy
      ? { id: subtask.createdBy.id, name: subtask.createdBy.name, email: subtask.createdBy.email }
      : null,
    taskId: subtask.taskId,
    recurrence: subtask.recurrence ?? null,
    recurrenceEndDate: subtask.recurrenceEndDate ? subtask.recurrenceEndDate.toISOString() : null,
    recurrenceSourceId: subtask.recurrenceSourceId ?? null,
    recurrenceNextId: subtask.recurrenceNext?.id ?? null,
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
    include: { owner: true, createdBy: true, recurrenceNext: { select: { id: true } }, task: { include: { client: true } } }
  })
  if (!subtask) return NextResponse.json({ error: 'Sub-task non trovato' }, { status: 404 })

  return NextResponse.json(toSubtaskDetailDTO(subtask))
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const existing = await prisma.subtask.findUnique({
    where: { id: params.id },
    include: { owner: true, task: true }
  })
  if (!existing) return NextResponse.json({ error: 'Sub-task non trovato' }, { status: 404 })
  if (!canManageSubtask(session, existing, existing.task.ownerId, 'update')) {
    return NextResponse.json({ error: 'Non hai i permessi per modificare questo sub-task' }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, status, ownerId, startDate, endDate, closedAt, recurrence, recurrenceEndDate } = body

  // Ricorrenza: '' / null = sub-task singolo. Serve una data di scadenza da cui ripartire.
  if (recurrence && !isRecurrence(recurrence)) {
    return NextResponse.json({ error: 'Ricorrenza non valida' }, { status: 400 })
  }
  const resultingEnd = endDate !== undefined ? endDate : existing.endDate
  if (recurrence && !resultingEnd) {
    return NextResponse.json({ error: 'Per un sub-task ricorrente serve la data di scadenza' }, { status: 400 })
  }

  const subtask = await prisma.subtask.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(ownerId !== undefined ? { ownerId } : {}),
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : new Date() } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      ...(closedAt !== undefined ? { closedAt: closedAt ? new Date(closedAt) : null } : {}),
      ...(recurrence !== undefined
        ? {
            recurrence: recurrence || null,
            recurrenceEndDate: recurrence && recurrenceEndDate ? new Date(recurrenceEndDate) : null
          }
        : {})
    },
    include: { owner: true, createdBy: true, recurrenceNext: { select: { id: true } }, task: { include: { subtasks: true, client: true } } }
  })

  const actorId = (session.user as any).id

  if (status !== undefined && status !== existing.status) {
    await logActivity({
      entityType: 'subtask',
      entityId: subtask.id,
      action: 'stato',
      entityLabel: subtask.title,
      detail: `${existing.status} → ${status}`,
      userId: actorId
    })
  }

  if (ownerId !== undefined && ownerId !== existing.ownerId) {
    await logActivity({
      entityType: 'subtask',
      entityId: subtask.id,
      action: 'owner',
      entityLabel: subtask.title,
      detail: `${existing.owner.name || existing.owner.email} → ${subtask.owner.name || subtask.owner.email}`,
      userId: actorId
    })
  }

  // Avvisi: nuovo owner e cambio di scadenza (fatti da un altro)
  const subOwnerChanged = ownerId !== undefined && ownerId !== existing.ownerId
  const subNewEnd = endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined
  const subEndChanged =
    subNewEnd !== undefined && (subNewEnd?.getTime() ?? null) !== (existing.endDate?.getTime() ?? null)
  if (subOwnerChanged || subEndChanged) {
    const who = await actorName(actorId)
    if (subOwnerChanged) {
      await notifyUser({
        userId: subtask.ownerId,
        actorId,
        reason: 'assegnato',
        entityType: 'subtask',
        entityId: subtask.id,
        message: assignedMessage(who, 'subtask', subtask.title)
      })
    } else {
      await notifyUser({
        userId: subtask.ownerId,
        actorId,
        reason: 'scadenza_cambiata',
        entityType: 'subtask',
        entityId: subtask.id,
        message: deadlineChangedMessage(who, 'subtask', subtask.title, existing.endDate, subNewEnd ?? null),
        mergeRecent: true
      })
    }
  }

  // Se il sub-task ricorrente risulta chiuso, crea il successivo (stesso task, da avviare).
  // Va fatto prima di valutare il padre: con un nuovo sub-task aperto il padre non va chiuso.
  const next = await spawnNextSubtask(subtask.id, actorId)
  const siblings = next
    ? await prisma.subtask.findMany({ where: { taskId: subtask.taskId }, select: { status: true } })
    : subtask.task.subtasks

  // Se cambiando questo sotto-task NON tutti i fratelli sono piu' completati,
  // annulliamo un'eventuale chiusura manuale precedente del padre.
  const derived = deriveTaskStatus(
    siblings.map((s) => s.status),
    subtask.task.closedManually,
    subtask.task.statusOverride
  )

  let pendingClosure = derived.pendingClosure

  if (subtask.task.closedManually && derived.status !== 'completato') {
    await prisma.task.update({ where: { id: subtask.task.id }, data: { closedManually: false } })
  }

  await syncTaskFromSubtask(subtask.taskId, subtask, (session.user as any).id)
  
  return NextResponse.json({
    subtask: toSubtaskDetailDTO(subtask),
    taskId: subtask.taskId,
    pendingClosure,
    nextSubtaskId: next ? next.id : null
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const existing = await prisma.subtask.findUnique({
    where: { id: params.id },
    include: { task: true }
  })
  if (!existing) return NextResponse.json({ error: 'Sub-task non trovato' }, { status: 404 })
  if (!canManageSubtask(session, existing, existing.task.ownerId, 'delete')) {
    return NextResponse.json({ error: 'Non hai i permessi per eliminare questo sub-task' }, { status: 403 })
  }

  await logActivity({
    entityType: 'subtask',
    entityId: existing.id,
    action: 'eliminato',
    entityLabel: existing.title,
    userId: (session.user as any).id
  })

  await prisma.subtask.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
