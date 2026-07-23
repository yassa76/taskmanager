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
  const { firstName, lastName, status, role } = body

  const member = await prisma.teamMember.update({
    where: { id: params.id },
    data: {
      ...(status !== undefined ? { status } : {})
    },
    include: { user: true }
  })

  const userUpdates: Record<string, any> = {}
  if (role !== undefined) userUpdates.role = role
  if (firstName !== undefined) userUpdates.firstName = firstName || null
  if (lastName !== undefined) userUpdates.lastName = lastName || null
  if (firstName !== undefined || lastName !== undefined) {
    const fName = firstName !== undefined ? firstName : member.user?.firstName
    const lName = lastName !== undefined ? lastName : member.user?.lastName
    userUpdates.name = [fName, lName].filter(Boolean).join(' ') || undefined
  }

  if (Object.keys(userUpdates).length > 0) {
    if (member.user) {
      await prisma.user.update({ where: { id: member.user.id }, data: userUpdates })
    } else {
      await prisma.user.upsert({
        where: { email: member.email },
        update: { ...userUpdates, teamMemberId: member.id },
        create: { email: member.email, role: 'normal', ...userUpdates, teamMemberId: member.id }
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
