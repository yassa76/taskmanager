import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/permissions'
import { OTHER_NOTIFICATION_TYPES, parsePrefs } from '@/lib/notifyShared'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: getUserId(session) }, select: { notificationPrefs: true } })
  return NextResponse.json({ prefs: parsePrefs(user?.notificationPrefs) })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const prefs = parsePrefs(JSON.stringify(body?.prefs ?? {}))
  // si salvano solo i tipi noti
  const clean: Record<string, boolean> = {}
  for (const t of OTHER_NOTIFICATION_TYPES) clean[t.key] = prefs[t.key]
  await prisma.user.update({ where: { id: getUserId(session) }, data: { notificationPrefs: JSON.stringify(clean) } })
  return NextResponse.json({ prefs: clean })
}
