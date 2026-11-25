import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const PAGE_SIZE = 25

// Chi si e' collegato e quando: elenco utenti (ultimo accesso / ultima attivita') + registro accessi.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  const where: Prisma.AccessLogWhereInput = {}
  if (q) {
    where.user = {
      is: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }
    }
  }

  const [users, lastLogins, total, logs] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, lastActiveAt: true },
      orderBy: { name: 'asc' }
    }),
    prisma.accessLog.groupBy({ by: ['userId'], _max: { createdAt: true } }),
    prisma.accessLog.count({ where }),
    prisma.accessLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    })
  ])

  const lastLogin = new Map(lastLogins.map((l) => [l.userId, l._max.createdAt]))
  return NextResponse.json({
    users: users
      .map((u) => ({
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        lastLoginAt: lastLogin.get(u.id)?.toISOString() ?? null,
        lastActiveAt: u.lastActiveAt?.toISOString() ?? null
      }))
      .sort((a, b) => (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? '')),
    total,
    page,
    pageSize: PAGE_SIZE,
    items: logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user.name || l.user.email,
      createdAt: l.createdAt.toISOString()
    }))
  })
}
