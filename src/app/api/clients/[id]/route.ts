import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEditRecord } from '@/lib/permissions'
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

const clientInclude = {
  projects: { select: { id: true, name: true } },
  owner: true,
  tasks: { select: { closedManually: true, statusOverride: true, subtasks: { select: { status: true } } } }
} as const

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: clientInclude
  })
  if (!client) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })

  return NextResponse.json(toClientDTO(client))
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const existing = await prisma.client.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  if (!canEditRecord(session, existing.ownerId)) {
    return NextResponse.json({ error: 'Non hai i permessi per modificare questo cliente' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, industry, ownerId } = body

  const client = await prisma.client.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(industry !== undefined ? { industry: industry || null } : {}),
      ...(ownerId !== undefined ? { ownerId: ownerId || null } : {})
    },
    include: clientInclude
  })

  return NextResponse.json(toClientDTO(client))
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const existing = await prisma.client.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  if (!canEditRecord(session, existing.ownerId)) {
    return NextResponse.json({ error: 'Non hai i permessi per eliminare questo cliente' }, { status: 403 })
  }

  await prisma.client.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
