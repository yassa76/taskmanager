import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/permissions'

// Viste salvate per utente: { [pagina]: [{ id, name, data }] } dove data e' lo stato dei filtri/ordinamento.
const keyOf = (userId: string) => `savedviews.${userId}`
type Views = Record<string, { id: string; name: string; data: unknown }[]>

async function read(userId: string): Promise<Views> {
  const row = await prisma.appSetting.findUnique({ where: { key: keyOf(userId) } })
  if (!row) return {}
  try {
    const parsed = JSON.parse(row.value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function write(userId: string, v: Views) {
  const key = keyOf(userId)
  const value = JSON.stringify(v)
  await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  return NextResponse.json({ views: await read(getUserId(session)) })
}

// { page, name, data } aggiunge (o sostituisce se esiste lo stesso nome); { page, deleteId } elimina
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const userId = getUserId(session)
  const body = await req.json().catch(() => ({}))
  const page = typeof body.page === 'string' ? body.page.slice(0, 40) : ''
  if (!page) return NextResponse.json({ error: 'Pagina mancante' }, { status: 400 })

  const all = await read(userId)
  let list = all[page] || []
  if (typeof body.deleteId === 'string') {
    list = list.filter((v) => v.id !== body.deleteId)
  } else {
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : ''
    if (!name) return NextResponse.json({ error: 'Nome mancante' }, { status: 400 })
    if (JSON.stringify(body.data ?? null).length > 4000) {
      return NextResponse.json({ error: 'Dati troppo grandi' }, { status: 400 })
    }
    const existing = list.find((v) => v.name.toLowerCase() === name.toLowerCase())
    if (existing) existing.data = body.data
    else {
      if (list.length >= 20) return NextResponse.json({ error: 'Massimo 20 viste salvate' }, { status: 400 })
      list.push({ id: Math.random().toString(36).slice(2, 10), name, data: body.data })
    }
  }
  all[page] = list
  await write(userId, all)
  return NextResponse.json({ views: all })
}
