import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManage } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const ACTION_LABELS: Record<string, string> = {
  creato: 'Creato',
  stato: 'Stato modificato',
  owner: 'Owner riassegnato',
  scadenza: 'Scadenza modificata',
  eliminato: 'Eliminato'
}
const PAGE_SIZE = 25

// Registro completo delle modifiche, paginato e ricercabile: solo admin.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'settings')) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const entityType = searchParams.get('entityType') || ''
  const action = searchParams.get('action') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  const where: Prisma.ActivityLogWhereInput = {}
  if (entityType) where.entityType = entityType
  if (action) where.action = action
  if (q) {
    where.OR = [
      { entityLabel: { contains: q, mode: 'insensitive' } },
      { detail: { contains: q, mode: 'insensitive' } },
      { user: { is: { name: { contains: q, mode: 'insensitive' } } } },
      { user: { is: { email: { contains: q, mode: 'insensitive' } } } }
    ]
  }

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    })
  ])

  return NextResponse.json({
    total,
    page,
    pageSize: PAGE_SIZE,
    items: logs.map((l) => ({
      id: l.id,
      entityType: l.entityType,
      entityId: l.entityId,
      entityLabel: l.entityLabel,
      action: l.action,
      actionLabel: ACTION_LABELS[l.action] || l.action,
      detail: l.detail,
      userId: l.user?.id ?? null,
      userName: l.user ? l.user.name || l.user.email : null,
      createdAt: l.createdAt.toISOString()
    }))
  })
}
