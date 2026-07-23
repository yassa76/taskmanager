import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deriveTaskStatus } from '@/lib/taskStatus'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const userId = (session.user as any).id

  const [myTasks, mySubtasks] = await Promise.all([
    prisma.task.findMany({
      where: { ownerId: userId },
      include: {
        owner: true,
        client: true,
        subtasks: true
      }
    }),
    prisma.subtask.findMany({
      where: { ownerId: userId },
      include: {
        task: { include: { client: true } }
      }
    })
  ])

  const now = new Date()

  const enrichedTasks = myTasks.map((t) => {
    const derived = deriveTaskStatus(
      t.subtasks.map((s) => s.status),
      t.closedManually
    )
    const overdue = !!t.endDate && t.endDate < now && derived.status !== 'completato'
    return {
      id: t.id,
      title: t.title,
      clientName: t.client?.name ?? null,
      endDate: t.endDate ? t.endDate.toISOString() : null,
      status: derived.status,
      overdue
    }
  })

  const upcomingTasks = enrichedTasks
    .filter((t) => t.status !== 'completato' && t.endDate)
    .sort((a, b) => (a.endDate! < b.endDate! ? -1 : a.endDate! > b.endDate! ? 1 : 0))
    .slice(0, 8)

  const upcomingSubtasks = mySubtasks
    .filter((s) => s.status !== 'completato')
    .map((s) => ({
      id: s.id,
      title: s.title,
      taskId: s.taskId,
      taskTitle: s.task.title,
      clientName: s.task.client?.name ?? null,
      endDate: s.endDate ? s.endDate.toISOString() : null,
      status: s.status,
      overdue: !!s.endDate && s.endDate < now
    }))
    .filter((s) => s.endDate)
    .sort((a, b) => (a.endDate! < b.endDate! ? -1 : a.endDate! > b.endDate! ? 1 : 0))
    .slice(0, 8)

  const kpi = {
    totalTasks: enrichedTasks.length,
    inProgress: enrichedTasks.filter((t) => t.status === 'in_corso').length,
    notStarted: enrichedTasks.filter((t) => t.status === 'da_avviare').length,
    completed: enrichedTasks.filter((t) => t.status === 'completato').length,
    overdueTasks: enrichedTasks.filter((t) => t.overdue).length,
    overdueSubtasks: mySubtasks.filter((s) => s.status !== 'completato' && s.endDate && s.endDate < now).length
  }

  return NextResponse.json({ kpi, upcomingTasks, upcomingSubtasks })
}
