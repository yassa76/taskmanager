import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deriveTaskStatus } from '@/lib/taskStatus'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const tasks = await prisma.task.findMany({
    include: {
      owner: true,
      client: true,
      subtasks: true
    }
  })

  const now = new Date()

  const enriched = tasks.map((t) => {
    const derived = deriveTaskStatus(t.subtasks.map((s) => s.status), t.closedManually)
    const overdue = !!t.endDate && t.endDate < now && derived.status !== 'completato'
    return { ...t, derived, overdue }
  })

  const totalTasks = enriched.length
  const completed = enriched.filter((t) => t.derived.status === 'completato').length
  const inProgress = enriched.filter((t) => t.derived.status === 'in_corso').length
  const notStarted = enriched.filter((t) => t.derived.status === 'da_avviare').length
  const overdue = enriched.filter((t) => t.overdue).length

  const totalSubtasks = tasks.reduce((acc, t) => acc + t.subtasks.length, 0)
  const completedSubtasks = tasks.reduce(
    (acc, t) => acc + t.subtasks.filter((s) => s.status === 'completato').length,
    0
  )

  // Task per owner
  const byOwnerMap = new Map<string, { name: string; total: number; completati: number }>()
  for (const t of enriched) {
    const key = t.owner.id
    const cur = byOwnerMap.get(key) || { name: t.owner.name || t.owner.email, total: 0, completati: 0 }
    cur.total += 1
    if (t.derived.status === 'completato') cur.completati += 1
    byOwnerMap.set(key, cur)
  }
  const byOwner = Array.from(byOwnerMap.values())

  // Task per cliente
  const byClientMap = new Map<string, { name: string; total: number }>()
  for (const t of enriched) {
    const key = t.client?.name || 'Senza cliente'
    const cur = byClientMap.get(key) || { name: key, total: 0 }
    cur.total += 1
    byClientMap.set(key, cur)
  }
  const byClient = Array.from(byClientMap.values())

  // Distribuzione stati (per grafico a torta)
  const statusDistribution = [
    { name: 'Da avviare', value: notStarted },
    { name: 'In corso', value: inProgress },
    { name: 'Completato', value: completed }
  ]

  return NextResponse.json({
    kpi: {
      totalTasks,
      completed,
      inProgress,
      notStarted,
      overdue,
      completionRate: totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0,
      totalSubtasks,
      completedSubtasks,
      subtaskCompletionRate:
        totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0
    },
    byOwner,
    byClient,
    statusDistribution
  })
}
