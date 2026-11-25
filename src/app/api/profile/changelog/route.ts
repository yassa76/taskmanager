import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/permissions'
import { CHANGELOG } from '@/data/changelog'

// Ultima novita' vista dalla persona (si tiene nelle impostazioni dell'app, una riga per utente).
const keyOf = (userId: string) => `changelogSeen.${userId}`

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const row = await prisma.appSetting.findUnique({ where: { key: keyOf(getUserId(session)) } })
  return NextResponse.json({ seen: row?.value ?? null })
}

// Segna tutte le novita' come viste: si salva la piu' recente dell'elenco.
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const value = CHANGELOG[0]?.id
  if (!value) return NextResponse.json({ seen: null })
  const key = keyOf(getUserId(session))
  await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
  return NextResponse.json({ seen: value })
}
