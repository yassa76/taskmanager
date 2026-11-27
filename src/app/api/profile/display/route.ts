import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/permissions'

// Preferenze di visualizzazione per utente (per ora la densita': "wide" = larga, "narrow" = stretta).
const keyOf = (userId: string) => `display.${userId}`

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const row = await prisma.appSetting.findUnique({ where: { key: keyOf(getUserId(session)) } }).catch(() => null)
  let density = 'wide'
  try {
    if (row && JSON.parse(row.value)?.density === 'narrow') density = 'narrow'
  } catch {}
  return NextResponse.json({ density })
}

// { density: 'wide' | 'narrow' }
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const density = body.density === 'narrow' ? 'narrow' : 'wide'
  const key = keyOf(getUserId(session))
  const value = JSON.stringify({ density })
  await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
  return NextResponse.json({ density })
}
