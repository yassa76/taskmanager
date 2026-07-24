import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deriveTaskStatus } from '@/lib/taskStatus'
import { isAdmin } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const userId = (session.user as any).id
  const { searchParams } = new URL(req.url)
  // Solo un admin puo' chiedere la vista "tutto il team": verificato lato server,
  // non ci si fida del solo parametro in arrivo dal client.
  const teamScope = searchParams.get('scope') === 'team' && isAdmin(session)

  const [tasks, subtasks] = await Promise.all([
    prisma.task.findMany({
      where: teamScope ? {} : { ownerId: userId },
      include: {
        owner: true,
        client: true,
        subtasks: true
      }
    }),
    prisma.subtask.findMany({
      where: teamScope ? {} : { ownerId: userId },
      include: {
        owner: true,
        task: { include: { client: true } }
      }
    })
  ])

  const now = new Date()

  const enrichedTasks = tasks.map((t) => {
    const derived = deriveTaskStatus(
      t.subtasks.map((s) => s.status),
      t.closedManually,
      t.statusOverride
    )
    const overdue = !!t.endDate && t.endDate < now && derived.status !== 'completato' && derived.status !== 'annullato'
    return {
      id: t.id,
      title: t.title,
      clientName: t.client?.name ?? null,
      ownerId: t.owner.id,
      ownerName: t.owner.name || t.owner.email,
      endDate: t.endDate ? t.endDate.toISOString() : null,
      status: derived.status,
      overdue
    }
  })

  const upcomingTasks = enrichedTasks
    .filter((t) => t.status !== 'completato' && t.status !== 'annullato' && t.endDate)
    .sort((a, b) => (a.endDate! < b.endDate! ? -1 : a.endDate! > b.endDate! ? 1 : 0))

  const upcomingSubtasks = subtasks
    .filter((s) => s.status !== 'completato' && s.status !== 'annullato')
    .map((s) => ({
      id: s.id,
      title: s.title,
      taskId: s.taskId,
      taskTitle: s.task.title,
      clientName: s.task.client?.name ?? null,
      ownerId: s.owner.id,
      ownerName: s.owner.name || s.owner.email,
      endDate: s.endDate ? s.endDate.toISOString() : null,
      status: s.status,
      overdue: !!s.endDate && s.endDate < now
    }))
    .filter((s) => s.endDate)
    .sort((a, b) => (a.endDate! < b.endDate! ? -1 : a.endDate! > b.endDate! ? 1 : 0))

  const kpi = {
    totalTasks: enrichedTasks.length,
    inProgress: enrichedTasks.filter((t) => t.status === 'in_corso').length,
    notStarted: enrichedTasks.filter((t) => t.status === 'da_avviare').length,
    completed: enrichedTasks.filter((t) => t.status === 'completato').length,
    overdueTasks: enrichedTasks.filter((t) => t.overdue).length,
    overdueSubtasks: subtasks.filter((s) => s.status !== 'completato' && s.status !== 'annullato' && s.endDate && s.endDate < now).length
  }

  // Tutte le scadenze (task + sub-task) per il calendario, senza limite di 8.
  const calendarItems = [
    ...tasks
      .filter((t) => t.endDate)
      .map((t) => ({
        id: t.id,
        type: 'task' as const,
        title: t.title,
        date: t.endDate!.toISOString().slice(0, 10),
        clientName: t.client?.name ?? null,
        ownerId: t.owner.id,
        ownerName: t.owner.name || t.owner.email
      })),
    ...subtasks
      .filter((s) => s.endDate)
      .map((s) => ({
        id: s.id,
        type: 'subtask' as const,
        title: s.title,
        date: s.endDate!.toISOString().slice(0, 10),
        clientName: s.task.client?.name ?? null,
        ownerId: s.owner.id,
        ownerName: s.owner.name || s.owner.email
      }))
  ]

  return NextResponse.json({ kpi, upcomingTasks, upcomingSubtasks, calendarItems, teamScope })
}
