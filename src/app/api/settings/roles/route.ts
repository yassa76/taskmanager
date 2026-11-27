import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManage } from '@/lib/permissions'
import { clearRoleCache } from '@/lib/rolePermissions'
import { getDefaultProfileKey, setDefaultProfileKey } from '@/lib/defaults'
import {
  permissionsFor,
  sanitizePermissions,
  SYSTEM_ROLE_DEFAULTS,
  SYSTEM_ROLE_NAMES,
  SYSTEM_ROLE_DESCRIPTIONS
} from '@/lib/permissionsShared'

// Profili: l'elenco (chiave, nome) lo leggono tutti (serve per le etichette nel Team);
// con ?full=1 (solo admin) arrivano anche permessi e numero di persone.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const full = new URL(req.url).searchParams.get('full') === '1'
  if (full && !canManage(session, 'profiles')) return NextResponse.json({ error: 'Solo gli admin' }, { status: 403 })

  const rows = await prisma.role.findMany({ orderBy: { createdAt: 'asc' } }).catch(() => [])
  const byKey = new Map(rows.map((r) => [r.key, r]))
  // i profili di sistema compaiono sempre, anche se la tabella non fosse ancora popolata
  const systemKeys = ['admin', 'normal', 'read_only']
  const ordered = [
    ...systemKeys.map((k) => byKey.get(k) ?? null).map((r, i) => r ?? { key: systemKeys[i], missing: true }),
    ...rows.filter((r) => !systemKeys.includes(r.key))
  ] as any[]

  const defaultKey = await getDefaultProfileKey()
  const counts = full ? await prisma.user.groupBy({ by: ['role'], _count: { _all: true } }) : []
  const countOf = (key: string) => counts.find((c) => c.role === key)?._count._all ?? 0

  return NextResponse.json({
    roles: ordered.map((r) => {
      const isSystem = systemKeys.includes(r.key)
      const base = {
        key: r.key as string,
        name: (r.name as string) || SYSTEM_ROLE_NAMES[r.key] || r.key,
        isSystem,
        isDefault: r.key === defaultKey,
        description: (r.description as string | null | undefined) ?? SYSTEM_ROLE_DESCRIPTIONS[r.key] ?? null
      }
      if (!full) return base
      let perms = permissionsFor(r.key)
      if (!r.missing && r.key !== 'admin') {
        try {
          perms = sanitizePermissions(JSON.parse(r.permissions))
        } catch {}
      }
      return {
        ...base,
        id: r.id ?? `role_${r.key}`,
        description: r.description ?? null,
        permissions: perms,
        users: countOf(r.key)
      }
    })
  })
}

function randomKey() {
  return 'r_' + Math.random().toString(36).slice(2, 10)
}

// Crea un profilo: { name, description?, copyFrom? (chiave di un profilo da cui partire) }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'profiles')) return NextResponse.json({ error: 'Solo gli admin possono creare profili' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : ''
  if (!name) return NextResponse.json({ error: 'Dai un nome al profilo' }, { status: 400 })
  const dup = await prisma.role.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
  if (dup) return NextResponse.json({ error: 'Esiste già un profilo con questo nome' }, { status: 409 })

  let start = permissionsFor('read_only')
  if (typeof body.copyFrom === 'string') {
    const src = await prisma.role.findUnique({ where: { key: body.copyFrom } })
    if (src) {
      try {
        start = sanitizePermissions(JSON.parse(src.permissions))
      } catch {}
    } else if (SYSTEM_ROLE_DEFAULTS[body.copyFrom]) start = permissionsFor(body.copyFrom)
  }
  await prisma.role.create({
    data: {
      key: randomKey(),
      name,
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 200) || null : null,
      permissions: JSON.stringify(start)
    }
  })
  clearRoleCache()
  return NextResponse.json({ ok: true })
}

// Modifica: { key, name?, description?, permissions? }. Il profilo Admin ha sempre tutti i permessi (nome e descrizione si possono cambiare).
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'profiles')) return NextResponse.json({ error: 'Solo gli admin possono modificare i profili' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const key = typeof body.key === 'string' ? body.key : ''

  let row = await prisma.role.findUnique({ where: { key } })
  if (!row && SYSTEM_ROLE_DEFAULTS[key]) {
    // profilo di sistema non ancora presente in tabella: lo si crea al volo
    row = await prisma.role.create({
      data: {
        key,
        name: SYSTEM_ROLE_NAMES[key],
        isSystem: true,
        permissions: JSON.stringify(permissionsFor(key))
      }
    })
  }
  if (!row) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  if (typeof body.isDefault === 'boolean') {
    if (body.isDefault && key === 'admin') {
      return NextResponse.json({ error: 'Il profilo Admin non può essere quello predefinito per i nuovi utenti' }, { status: 400 })
    }
    if (body.isDefault) await setDefaultProfileKey(key)
    else if ((await getDefaultProfileKey()) === key) await setDefaultProfileKey(null)
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    const name = body.name.trim().slice(0, 40)
    if (!name) return NextResponse.json({ error: 'Il nome non può essere vuoto' }, { status: 400 })
    const dup = await prisma.role.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, NOT: { id: row.id } } })
    if (dup) return NextResponse.json({ error: 'Esiste già un profilo con questo nome' }, { status: 409 })
    data.name = name
  }
  if (typeof body.description === 'string') data.description = body.description.trim().slice(0, 200) || null
  // i permessi del profilo Admin sono sempre completi e non si modificano; nome e descrizione si'
  if (body.permissions !== undefined && key !== 'admin') data.permissions = JSON.stringify(sanitizePermissions(body.permissions))
  if (Object.keys(data).length > 0) await prisma.role.update({ where: { id: row.id }, data })
  clearRoleCache()
  return NextResponse.json({ ok: true })
}

// Elimina un profilo personalizzato, solo se nessuna persona lo ha: { key }
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'profiles')) return NextResponse.json({ error: 'Solo gli admin possono eliminare profili' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const row = await prisma.role.findUnique({ where: { key: String(body.key || '') } })
  if (!row) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })
  if (row.isSystem) return NextResponse.json({ error: 'I profili di sistema non si eliminano' }, { status: 400 })
  if ((await getDefaultProfileKey()) === row.key) {
    return NextResponse.json({ error: 'È il profilo predefinito dei nuovi utenti: sceglierne un altro prima di eliminarlo' }, { status: 409 })
  }
  const users = await prisma.user.count({ where: { role: row.key } })
  if (users > 0) {
    return NextResponse.json(
      { error: `Il profilo è assegnato a ${users} ${users === 1 ? 'persona' : 'persone'}: cambia prima il loro profilo` },
      { status: 409 }
    )
  }
  await prisma.role.delete({ where: { id: row.id } })
  clearRoleCache()
  return NextResponse.json({ ok: true })
}
