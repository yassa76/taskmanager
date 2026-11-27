import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManage } from '@/lib/permissions'
import { RETENTION_OPTIONS, getRetention, setRetention } from '@/lib/retention'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'settings')) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  return NextResponse.json({ ...(await getRetention()), options: RETENTION_OPTIONS })
}

// { kind: "access" | "activity", days: 90 }
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'settings')) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  if ((body.kind !== 'access' && body.kind !== 'activity') || !(await setRetention(body.kind, Number(body.days)))) {
    return NextResponse.json({ error: 'Valore non valido' }, { status: 400 })
  }
  return NextResponse.json({ ...(await getRetention()), options: RETENTION_OPTIONS })
}
