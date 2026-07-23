import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/permissions'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Solo un admin puo modificare il team' }, { status: 403 })

  const body = await req.json()
  const { name, active, role } = body

  const member = await prisma.teamMember.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(active !== undefined ? { active } : {})
    },
    include: { user: true }
  })

  if (role !== undefined) {
    if (member.user) {
      await prisma.user.update({ where: { id: member.user.id }, data: { role } })
    } else {
      // Non aveva ancora un account collegato (caso raro, membri creati prima
      // di questa funzione): lo creiamo ora cosi' il ruolo si puo' comunque salvare.
      await prisma.user.upsert({
        where: { email: member.email },
        update: { role, teamMemberId: member.id },
        create: { email: member.email, name: member.name, role, teamMemberId: member.id }
      })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Solo un admin puo modificare il team' }, { status: 403 })

  await prisma.teamMember.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
