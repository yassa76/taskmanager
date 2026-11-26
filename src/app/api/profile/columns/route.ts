import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/permissions'

// Preferenze delle colonne delle tabelle (ordine e colonne nascoste), una riga per utente:
// { [idTabella]: { order: string[], hidden: string[] } }
const keyOf = (userId: string) => `colprefs.${userId}`
type Prefs = Record<string, { order: string[]; hidden: string[] }>

async function read(userId: string): Promise<Prefs> {
  const row = await prisma.appSetting.findUnique({ where: { key: keyOf(userId) } })
  if (!row) return {}
  try {
    const parsed = JSON.parse(row.value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  return NextResponse.json({ tables: await read(getUserId(session)) })
}

// { tableId: string, order: string[], hidden: string[] }; con reset:true si torna all'ordine predefinito
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const userId = getUserId(session)
  const body = await req.json().catch(() => ({}))
  const tableId = typeof body.tableId === 'string' ? body.tableId.slice(0, 60) : ''
  if (!tableId) return NextResponse.json({ error: 'Tabella mancante' }, { status: 400 })

  const clean = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 40).map((x) => x.slice(0, 60)) : []

  const prefs = await read(userId)
  if (body.reset) delete prefs[tableId]
  else prefs[tableId] = { order: clean(body.order), hidden: clean(body.hidden) }

  const value = JSON.stringify(prefs)
  const key = keyOf(userId)
  await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
  return NextResponse.json({ tables: prefs })
}
