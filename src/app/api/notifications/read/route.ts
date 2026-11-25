import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/permissions'

// Segna come letti gli avvisi indicati (ids) oppure tutti (all: true). Solo i propri.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const userId = getUserId(session)

  const body = await req.json().catch(() => ({}))
  const where: any = { userId, readAt: null }
  if (body.all) {
    // "tutti" puo' riguardare solo un gruppo (menzioni o altro)
    if (body.kind === 'menzioni') where.reason = 'menzione'
    else if (body.kind === 'altro') where.reason = { not: 'menzione' }
  } else {
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : []
    if (ids.length === 0) return NextResponse.json({ error: 'Nessun avviso indicato' }, { status: 400 })
    where.id = { in: ids }
  }
  await prisma.notification.updateMany({ where, data: { readAt: new Date() } })
  return NextResponse.json({ ok: true })
}
