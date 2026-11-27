import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManage } from '@/lib/permissions'
import { FREE_MONTHLY_CAP, getLimits, getUsage, saveLimits } from '@/lib/geocodeLimits'

async function snapshot() {
  const [limits, usage] = await Promise.all([getLimits(), getUsage()])
  return {
    ...limits,
    usedToday: usage.usedToday,
    usedMonth: usage.usedMonth,
    freeMonthlyCap: FREE_MONTHLY_CAP,
    // Solo se la chiave e' presente: il valore non viene mai restituito.
    keyConfigured: !!process.env.GOOGLE_MAPS_API_KEY
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'settings')) return NextResponse.json({ error: 'Solo gli admin possono vedere le impostazioni' }, { status: 403 })
  return NextResponse.json(await snapshot())
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'settings')) return NextResponse.json({ error: 'Solo gli admin possono modificare le impostazioni' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const dailyLimit = Number(body.dailyLimit)
  const monthlyLimit = Number(body.monthlyLimit)

  if (!Number.isInteger(dailyLimit) || !Number.isInteger(monthlyLimit) || dailyLimit < 0 || monthlyLimit < 0) {
    return NextResponse.json({ error: 'I limiti devono essere numeri interi, zero o maggiori' }, { status: 400 })
  }
  if (monthlyLimit > FREE_MONTHLY_CAP) {
    return NextResponse.json(
      {
        error: `Il limite mensile non puo' superare ${FREE_MONTHLY_CAP.toLocaleString('it-IT')}: oltre questa soglia Google addebita il servizio.`
      },
      { status: 400 }
    )
  }
  if (dailyLimit > monthlyLimit) {
    return NextResponse.json({ error: 'Il limite giornaliero non puo\' superare quello mensile' }, { status: 400 })
  }

  await saveLimits(dailyLimit, monthlyLimit)
  return NextResponse.json(await snapshot())
}
