import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const clients = await prisma.client.findMany({
    include: { projects: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })

  const client = await prisma.client.upsert({
    where: { name },
    update: {},
    create: { name }
  })
  return NextResponse.json(client, { status: 201 })
}
