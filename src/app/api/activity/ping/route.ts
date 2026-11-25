import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runCleanupIfDue } from '@/lib/retention'
import { ensureDeadlineNotifications } from '@/lib/notify'

// Il browser lo chiama quando la persona usa davvero l'app (click, tastiera), non a intervalli
// fissi: cosi' una finestra lasciata aperta e ferma non risulta "attiva".
export async function POST() {
  const session = await getServerSession(authOptions)
  const id = (session?.user as any)?.id as string | undefined
  if (!id) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  await prisma.user.update({ where: { id }, data: { lastActiveAt: new Date() } })
  await runCleanupIfDue()
  await ensureDeadlineNotifications(id)
  return NextResponse.json({ ok: true })
}
