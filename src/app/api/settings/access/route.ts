import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// Chi si e' collegato e quando: per ogni utente, ultimo accesso e ultima attivita'.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!can(session, 'accesslog', 'read')) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const [users, lastLogins] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, lastActiveAt: true },
      orderBy: { name: 'asc' }
    }),
    prisma.accessLog.groupBy({ by: ['userId'], _max: { createdAt: true } })
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
      .sort((a, b) => (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? ''))
  })
}
