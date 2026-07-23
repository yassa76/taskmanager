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
    status: m.status as TeamMemberDTO['status'],
    invitedAt: m.invitedAt.toISOString(),
    matchedUser: m.user
      ? {
          id: m.user.id,
          name: m.user.name,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: m.user.email,
          image: m.user.image,
          role: m.user.role
        }
      : null
  }))

  return NextResponse.json(dtos)
}

// Aggiunge una nuova email alla lista team (stato iniziale: "new") e crea
// subito un account "segnaposto" collegato, cosi' la persona e' selezionabile
// come owner da subito. Nome e cognome inseriti qui vanno direttamente sul
// profilo utente (stessi campi che la persona potra' poi modificare da sola).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json()
  const { email, firstName, lastName } = body
  if (!email) return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 })
  if (!firstName) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })

  const member = await prisma.teamMember.upsert({
    where: { email },
    update: {},
    create: { email }
  })

  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  const placeholderUser = await prisma.user.upsert({
    where: { email },
    update: { firstName, lastName: lastName || null, name: fullName, teamMemberId: member.id },
    create: {
      email,
      firstName,
      lastName: lastName || null,
      name: fullName,
      role: 'normal',
      teamMemberId: member.id
    }
  })

  return NextResponse.json({ member, user: placeholderUser }, { status: 201 })
}
