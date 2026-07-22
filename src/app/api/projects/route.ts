import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')

  const projects = await prisma.project.findMany({
    where: clientId ? { clientId } : {},
    include: { client: true },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { name, clientId } = await req.json()
  if (!name || !clientId) {
    return NextResponse.json({ error: 'Nome e cliente sono obbligatori' }, { status: 400 })
  }

  const project = await prisma.project.upsert({
    where: { clientId_name: { clientId, name } },
    update: {},
    create: { name, clientId }
  })
  return NextResponse.json(project, { status: 201 })
}
