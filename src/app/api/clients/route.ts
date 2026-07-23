import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canCreate } from '@/lib/permissions'
import { deriveTaskStatus } from '@/lib/taskStatus'
import type { ClientDTO } from '@/types'

function toClientDTO(client: any): ClientDTO {
  const activeTasksCount = (client.tasks || []).filter((t: any) => {
    const derived = deriveTaskStatus(
      t.subtasks.map((s: any) => s.status),
      t.closedManually,
      t.statusOverride
    )
    return derived.status !== 'completato'
  }).length

  return {
    id: client.id,
    name: client.name,
    description: client.description,
    industry: client.industry,
    owner: client.owner
      ? { id: client.owner.id, name: client.owner.name, email: client.owner.email }
      : null,
    projects: client.projects.map((p: any) => ({ id: p.id, name: p.name })),
    activeTasksCount
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const clients = await prisma.client.findMany({
    include: {
      projects: { select: { id: true, name: true } },
      owner: true,
      tasks: { select: { closedManually: true, statusOverride: true, subtasks: { select: { status: true } } } }
    },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(clients.map(toClientDTO))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canCreate(session)) return NextResponse.json({ error: 'Utente in sola lettura' }, { status: 403 })

  const { name, description, industry, ownerId } = await req.json()
  if (!name) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })

  const client = await prisma.client.upsert({
    where: { name },
    update: {},
    create: {
      name,
      description: description || null,
      industry: industry || null,
      ownerId: ownerId || null
    },
    include: {
      projects: { select: { id: true, name: true } },
      owner: true,
      tasks: { select: { closedManually: true, statusOverride: true, subtasks: { select: { status: true } } } }
    }
  })
  return NextResponse.json(toClientDTO(client), { status: 201 })
}
