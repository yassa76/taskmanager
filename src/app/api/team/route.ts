import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { TeamMemberDTO } from '@/types'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const members = await prisma.teamMember.findMany({
    include: { user: true },
    orderBy: { invitedAt: 'asc' }
  })

  const dtos: TeamMemberDTO[] = members.map((m) => ({
    id: m.id,
    email: m.email,
    name: m.name,
    status: m.status as TeamMemberDTO['status'],
    invitedAt: m.invitedAt.toISOString(),
    matchedUser: m.user
      ? { id: m.user.id, name: m.user.name, email: m.user.email, image: m.user.image, role: m.user.role }
      : null
  }))

  return NextResponse.json(dtos)
}

// Aggiunge una nuova email alla lista team (stato iniziale: "new") e crea
// subito un account "segnaposto" collegato, cosi' la persona e' selezionabile
// come owner da subito. Quando fara' il login reale con Google usando questa
// email, l'account verra' automaticamente collegato (non duplicato) e lo
// stato passera' ad "active".
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json()
  const { email, name } = body
  if (!email) return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })

  const member = await prisma.teamMember.upsert({
    where: { email },
    update: { name },
    create: { email, name }
  })

  const placeholderUser = await prisma.user.upsert({
    where: { email },
    update: { name, teamMemberId: member.id },
    create: { email, name, role: 'normal', teamMemberId: member.id }
  })

  return NextResponse.json({ member, user: placeholderUser }, { status: 201 })
}
