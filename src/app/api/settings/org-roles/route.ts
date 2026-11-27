import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManage } from '@/lib/permissions'
import { descendantIds, loadOrgRoleRows } from '@/lib/orgRoles'
import { isClientVisibility, isTaskVisibility } from '@/lib/visibilityShared'

// Ruoli aziendali (gerarchia). L'elenco lo leggono tutti (serve per le etichette nel Team);
// creare, modificare ed eliminare richiede il permesso "Profili e ruoli".
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const rows = await prisma.orgRole
    .findMany({ orderBy: { createdAt: 'asc' }, include: { _count: { select: { users: true } } } })
    .catch(() => [])
  return NextResponse.json({
    orgRoles: rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      parentId: r.parentId,
      taskVisibility: r.taskVisibility,
      clientVisibility: r.clientVisibility,
      users: r._count.users
    }))
  })
}

// { name, description?, parentId?, taskVisibility?, clientVisibility? }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'profiles')) return NextResponse.json({ error: 'Il tuo profilo non può gestire i ruoli' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : ''
  if (!name) return NextResponse.json({ error: 'Dai un nome al ruolo' }, { status: 400 })
  if (await prisma.orgRole.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })) {
    return NextResponse.json({ error: 'Esiste già un ruolo con questo nome' }, { status: 409 })
  }
  let parentId: string | null = null
  if (typeof body.parentId === 'string' && body.parentId) {
    if (!(await prisma.orgRole.findUnique({ where: { id: body.parentId } }))) {
      return NextResponse.json({ error: 'Ruolo superiore non valido' }, { status: 400 })
    }
    parentId = body.parentId
  }
  const created = await prisma.orgRole.create({
    data: {
      name,
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 200) || null : null,
      parentId,
      ...(isTaskVisibility(body.taskVisibility) ? { taskVisibility: body.taskVisibility } : {}),
      ...(isClientVisibility(body.clientVisibility) ? { clientVisibility: body.clientVisibility } : {})
    }
  })
  return NextResponse.json({ ok: true, id: created.id })
}

// { id, name?, description?, parentId? (null = in cima), taskVisibility?, clientVisibility? }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'profiles')) return NextResponse.json({ error: 'Il tuo profilo non può gestire i ruoli' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id : ''
  const row = await prisma.orgRole.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ error: 'Ruolo non trovato' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    const name = body.name.trim().slice(0, 40)
    if (!name) return NextResponse.json({ error: 'Il nome non può essere vuoto' }, { status: 400 })
    if (await prisma.orgRole.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } } })) {
      return NextResponse.json({ error: 'Esiste già un ruolo con questo nome' }, { status: 409 })
    }
    data.name = name
  }
  if (typeof body.description === 'string') data.description = body.description.trim().slice(0, 200) || null
  if (body.parentId !== undefined) {
    const parentId = typeof body.parentId === 'string' && body.parentId ? body.parentId : null
    if (parentId) {
      const rows = await loadOrgRoleRows()
      // niente cicli: il ruolo superiore non puo' essere il ruolo stesso ne' uno dei suoi sottostanti
      if (parentId === id || descendantIds(rows, id).includes(parentId)) {
        return NextResponse.json({ error: 'Il ruolo superiore non può essere lui stesso o un suo sottostante' }, { status: 400 })
      }
      if (!rows.some((r) => r.id === parentId)) return NextResponse.json({ error: 'Ruolo superiore non valido' }, { status: 400 })
    }
    data.parentId = parentId
  }
  if (body.taskVisibility !== undefined) {
    if (!isTaskVisibility(body.taskVisibility)) return NextResponse.json({ error: 'Visibilità non valida' }, { status: 400 })
    data.taskVisibility = body.taskVisibility
  }
  if (body.clientVisibility !== undefined) {
    if (!isClientVisibility(body.clientVisibility)) return NextResponse.json({ error: 'Visibilità non valida' }, { status: 400 })
    data.clientVisibility = body.clientVisibility
  }
  if (Object.keys(data).length > 0) await prisma.orgRole.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}

// { id }: solo se nessuna persona lo ha; i ruoli sottostanti salgono di un livello.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'profiles')) return NextResponse.json({ error: 'Il tuo profilo non può gestire i ruoli' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const row = await prisma.orgRole.findUnique({ where: { id: String(body.id || '') } })
  if (!row) return NextResponse.json({ error: 'Ruolo non trovato' }, { status: 404 })
  const users = await prisma.user.count({ where: { orgRoleId: row.id } })
  if (users > 0) {
    return NextResponse.json(
      { error: `Il ruolo è assegnato a ${users} ${users === 1 ? 'persona' : 'persone'}: cambia prima il loro ruolo` },
      { status: 409 }
    )
  }
  await prisma.orgRole.updateMany({ where: { parentId: row.id }, data: { parentId: row.parentId } })
  await prisma.orgRole.delete({ where: { id: row.id } })
  return NextResponse.json({ ok: true })
}
