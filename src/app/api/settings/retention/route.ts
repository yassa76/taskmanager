import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { RETENTION_OPTIONS, getRetention, setRetention } from '@/lib/retention'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!can(session, 'activitylog', 'read') && !can(session, 'accesslog', 'read')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  return NextResponse.json({ ...(await getRetention()), options: RETENTION_OPTIONS })
}

// { kind: "access" | "activity", days: 90 }
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (!can(session, body.kind === 'access' ? 'accesslog' : 'activitylog', 'update')) {
    return NextResponse.json({ error: 'Il tuo profilo non può modificare questa impostazione' }, { status: 403 })
  }
  if ((body.kind !== 'access' && body.kind !== 'activity') || !(await setRetention(body.kind, Number(body.days)))) {
    return NextResponse.json({ error: 'Valore non valido' }, { status: 400 })
  }
  return NextResponse.json({ ...(await getRetention()), options: RETENTION_OPTIONS })
}
