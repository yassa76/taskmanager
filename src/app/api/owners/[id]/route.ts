import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { countActiveSubtasks, deriveTaskStatus } from '@/lib/taskStatus'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const owner = await prisma.user.findUnique({ where: { id: params.id } })
  if (!owner) return NextResponse.json({ error: 'Persona non trovata' }, { status: 404 })

  const [tasks, subtasks] = await Promise.all([
    prisma.task.findMany({
      where: { ownerId: params.id },
      include: { client: true, subtasks: true },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.subtask.findMany({
      where: { ownerId: params.id },
      include: { task: { include: { client: true } } },
      orderBy: { updatedAt: 'desc' }
    })
  ])

  const now = new Date()

  // Sub-task ancora attivi di QUESTA persona, per task (nella lista dei task si mostra il suo carico)
  const ownActiveByTask = new Map<string, number>()
  for (const s of subtasks) {
    if (s.status === 'completato' || s.status === 'annullato') continue
    ownActiveByTask.set(s.taskId, (ownActiveByTask.get(s.taskId) ?? 0) + 1)
  }

  const taskDtos = tasks.map((t) => {
    const derived = deriveTaskStatus(
      t.subtasks.map((s) => s.status),
      t.closedManually,
      t.statusOverride
    )
    const overdue =
      !!t.endDate && t.endDate < now && derived.status !== 'completato' && derived.status !== 'annullato'
    return {
      id: t.id,
      title: t.title,
      clientId: t.clientId,
      clientName: t.client?.name ?? null,
      startDate: t.startDate ? t.startDate.toISOString() : null,
      endDate: t.endDate ? t.endDate.toISOString() : null,
      status: derived.status,
      progress: derived.progress,
      activeSubtasks: ownActiveByTask.get(t.id) ?? 0,
      activeSubtasksAll: countActiveSubtasks(t.subtasks.map((s) => s.status)),
      totalSubtasks: t.subtasks.length,
      overdue
    }
  })

  const subtaskDtos = subtasks.map((s) => {
    const overdue = !!s.endDate && s.endDate < now && s.status !== 'completato' && s.status !== 'annullato'
    return {
      id: s.id,
      title: s.title,
      status: s.status,
      recurrence: s.recurrence ?? null,
      endDate: s.endDate ? s.endDate.toISOString() : null,
      taskId: s.taskId,
      taskTitle: s.task.title,
      clientId: s.task.clientId,
      clientName: s.task.client?.name ?? null,
      overdue
    }
  })

  return NextResponse.json({
    owner: {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      image: owner.image,
      role: owner.role
    },
    tasks: taskDtos,
    subtasks: subtaskDtos
  })
}
