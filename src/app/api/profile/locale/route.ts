import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/permissions'
import { DEFAULT_TZ, isValidTz } from '@/lib/locale'

// Fuso orario per utente: da qui l'app ricava il formato di numeri, date e orari.
const keyOf = (userId: string) => `locale.${userId}`

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const row = await prisma.appSetting.findUnique({ where: { key: keyOf(getUserId(session)) } }).catch(() => null)
  let timeZone = DEFAULT_TZ
  try {
    const tz = row ? JSON.parse(row.value)?.timeZone : null
    if (isValidTz(tz)) timeZone = tz
  } catch {}
  return NextResponse.json({ timeZone })
}

// { timeZone: 'Europe/Rome' }
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (!isValidTz(body.timeZone)) return NextResponse.json({ error: 'Fuso orario non valido' }, { status: 400 })
  const key = keyOf(getUserId(session))
  const value = JSON.stringify({ timeZone: body.timeZone })
  await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
  return NextResponse.json({ timeZone: body.timeZone })
}
