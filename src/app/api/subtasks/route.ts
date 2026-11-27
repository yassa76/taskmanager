import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVisibility, subtaskWhere, resolveScope, scopeOwnerWhere } from '@/lib/visibility'

// Elenco dei sub-task visibili alla persona. Vista standard: "miei" e "del mio team" restringono ai proprietari;
// senza vista o con "tutti" valgono tutti quelli visibili.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const vis = await getVisibility(session)
  const scopeParam = new URL(req.url).searchParams.get('scope')
  const scopeWhere = !scopeParam || scopeParam === 'all' ? {} : scopeOwnerWhere(vis, resolveScope(vis, scopeParam))

  const rows = await prisma.subtask.findMany({
    where: { AND: [subtaskWhere(vis), scopeWhere] },
    include: { owner: true, task: { include: { client: true } } },
    orderBy: { endDate: 'asc' }
  })

  return NextResponse.json(
    rows.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate ? s.endDate.toISOString() : null,
      owner: { id: s.owner.id, name: s.owner.name, email: s.owner.email },
      taskId: s.taskId,
      taskTitle: s.task.title,
      clientId: s.task.clientId,
      clientName: s.task.client?.name ?? null,
      recurrence: s.recurrence ?? null
    }))
  )
}
