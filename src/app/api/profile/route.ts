import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const userId = (session.user as any).id
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  return NextResponse.json({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    themeColor: user.themeColor
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json()
  const { firstName, lastName, themeColor } = body

  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(firstName !== undefined ? { firstName: firstName || null } : {}),
      ...(lastName !== undefined ? { lastName: lastName || null } : {}),
      ...(themeColor !== undefined ? { themeColor } : {}),
      ...(fullName ? { name: fullName } : {})
    }
  })

  return NextResponse.json({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    themeColor: user.themeColor
  })
}
