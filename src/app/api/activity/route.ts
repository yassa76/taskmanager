import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVisibility, canSeeTask, canSeeSubtaskById, canSeeClient } from '@/lib/visibility'

const ACTION_LABELS: Record<string, string> = {
  creato: 'Creato',
  stato: 'Stato modificato',
  owner: 'Owner riassegnato',
  eliminato: 'Eliminato'
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entityType')
  const entityId = searchParams.get('entityId')
  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType e entityId sono obbligatori' }, { status: 400 })
  }

  {
    const vis = await getVisibility(session)
    const visible =
      entityType === 'task'
        ? await canSeeTask(vis, entityId)
        : entityType === 'subtask'
          ? await canSeeSubtaskById(vis, entityId)
          : entityType === 'client'
            ? await canSeeClient(vis, entityId)
            : true
    if (!visible) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  }

  const logs = await prisma.activityLog.findMany({
    where: { entityType, entityId },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  return NextResponse.json(
    logs.map((l) => ({
      id: l.id,
      action: l.action,
      actionLabel: ACTION_LABELS[l.action] || l.action,
      detail: l.detail,
      userName: l.user ? l.user.name || l.user.email : null,
      userId: l.user?.id ?? null,
      createdAt: l.createdAt.toISOString()
    }))
  )
}
