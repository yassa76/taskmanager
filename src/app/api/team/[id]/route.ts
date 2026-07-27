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
      // Non aveva ancora un account collegato (caso raro): lo creiamo ora.
      await prisma.user.upsert({
        where: { email: member.email },
        update: { ...userUpdates, teamMemberId: member.id },
        create: { email: member.email, role: 'normal', ...userUpdates, teamMemberId: member.id }
      })
    }
  }

  return NextResponse.json({ ok: true })
}

// Rimuove la persona dal Team. Se aveva un account collegato senza alcun
// task/sub-task/cliente posseduto o creato (es. un segnaposto mai usato, o
// un duplicato ormai vuoto dopo aver spostato tutto altrove), cancella
// anche quell'account, cosi' non restano righe orfane nel database. Se
// invece l'account ha ancora qualcosa collegato, lo lasciamo intatto per
// non perdere dati: resta semplicemente "sganciato" dal Team.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Solo un admin puo modificare il team' }, { status: 403 })

  const member = await prisma.teamMember.findUnique({ where: { id: params.id }, include: { user: true } })
  if (!member) return NextResponse.json({ error: 'Membro non trovato' }, { status: 404 })

  const linkedUserId = member.user?.id

  // Scollega prima l'utente dal team member, cosi' la cancellazione del
  // team member stesso non incontra vincoli di riferimento.
  if (linkedUserId) {
    await prisma.user.update({ where: { id: linkedUserId }, data: { teamMemberId: null } })
  }

  await prisma.teamMember.delete({ where: { id: params.id } })

  if (linkedUserId) {
    const [ownedTasks, ownedSubtasks, ownedClients, createdTasks, createdSubtasks, createdClients] =
      await Promise.all([
        prisma.task.count({ where: { ownerId: linkedUserId } }),
        prisma.subtask.count({ where: { ownerId: linkedUserId } }),
        prisma.client.count({ where: { ownerId: linkedUserId } }),
        prisma.task.count({ where: { createdById: linkedUserId } }),
        prisma.subtask.count({ where: { createdById: linkedUserId } }),
        prisma.client.count({ where: { createdById: linkedUserId } })
      ])

    const isEmpty =
      ownedTasks === 0 &&
      ownedSubtasks === 0 &&
      ownedClients === 0 &&
      createdTasks === 0 &&
      createdSubtasks === 0 &&
      createdClients === 0

    if (isEmpty) {
      await prisma.user.delete({ where: { id: linkedUserId } })
    }
  }

  return NextResponse.json({ ok: true })
}
