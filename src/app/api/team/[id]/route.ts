import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can, isAdmin } from '@/lib/permissions'
import { getRolePermissions } from '@/lib/rolePermissions'
import { countActiveAdmins } from '@/lib/admins'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!can(session, 'team', 'update')) return NextResponse.json({ error: 'Il tuo profilo non può modificare il team' }, { status: 403 })

  const body = await req.json()
  const { firstName, lastName, status, role, orgRoleId } = body

  if (orgRoleId && !(await prisma.orgRole.findUnique({ where: { id: String(orgRoleId) } }))) {
    return NextResponse.json({ error: 'Ruolo non valido' }, { status: 400 })
  }

  if (role !== undefined) {
    const exists = ['admin', 'normal', 'read_only'].includes(role) || !!(await prisma.role.findUnique({ where: { key: String(role) } }))
    if (!exists) return NextResponse.json({ error: 'Profilo non valido' }, { status: 400 })
    // per non scalare i privilegi: solo un admin puo' assegnare il profilo Admin, e solo chi puo' modificare i profili puo' assegnarne uno che lo permette
    if (role === 'admin' && !isAdmin(session)) {
      return NextResponse.json({ error: 'Solo un amministratore può assegnare il profilo Admin' }, { status: 403 })
    }
    if (role !== 'admin' && !can(session, 'profiles', 'update') && can({ user: { role, permissions: await getRolePermissions(role) } }, 'profiles', 'update')) {
      return NextResponse.json({ error: 'Non puoi assegnare un profilo con più privilegi dei tuoi' }, { status: 403 })
    }
  }

  // Deve esistere sempre almeno un amministratore attivo: altrimenti nessuno potrebbe piu' approvare accessi o gestire i profili.
  {
    const target = await prisma.teamMember.findUnique({ where: { id: params.id }, include: { user: true } })
    const losesAdmin =
      target?.user?.role === 'admin' &&
      ((role !== undefined && role !== 'admin') || (status !== undefined && ['inactive', 'rejected', 'pending'].includes(status)))
    if (losesAdmin && (await countActiveAdmins()) <= 1) {
      return NextResponse.json({ error: 'Deve restare almeno un amministratore attivo' }, { status: 400 })
    }
  }

  const member = await prisma.teamMember.update({
    where: { id: params.id },
    data: {
      ...(status !== undefined ? { status } : {})
    },
    include: { user: true }
  })

  const userUpdates: Record<string, any> = {}
  if (role !== undefined) userUpdates.role = role
  if (orgRoleId !== undefined) userUpdates.orgRoleId = orgRoleId || null
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

// Elimina la persona dal Team e dal database (anche l'account collegato, con sessioni e notifiche).
// Se e' ancora owner di task, sub-task o clienti, o ha scritto commenti, si blocca: prima vanno riassegnati.
// I record che ha solo creato restano, senza piu' il nome del creatore.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!can(session, 'team', 'delete')) return NextResponse.json({ error: 'Il tuo profilo non può eliminare dal team' }, { status: 403 })

  const member = await prisma.teamMember.findUnique({ where: { id: params.id }, include: { user: true } })
  if (!member) return NextResponse.json({ error: 'Membro non trovato' }, { status: 404 })
  if (member.user?.role === 'admin' && (await countActiveAdmins()) <= 1) {
    return NextResponse.json({ error: 'Non puoi rimuovere l\'ultimo amministratore attivo' }, { status: 400 })
  }

  const linkedUserId = member.user?.id

  if (linkedUserId) {
    const [tasks, subtasks, clients, comments] = await Promise.all([
      prisma.task.count({ where: { ownerId: linkedUserId } }),
      prisma.subtask.count({ where: { ownerId: linkedUserId } }),
      prisma.client.count({ where: { ownerId: linkedUserId } }),
      prisma.comment.count({ where: { authorId: linkedUserId } })
    ])
    const parts = [
      tasks && `${tasks} task`,
      subtasks && `${subtasks} sub-task`,
      clients && `${clients} clienti`,
      comments && `${comments} commenti`
    ].filter(Boolean)
    if (parts.length > 0) {
      return NextResponse.json(
        { error: `Non si può eliminare: ha ancora ${parts.join(', ')}. Riassegna prima i record a un'altra persona.` },
        { status: 409 }
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    if (linkedUserId) {
      // chi ha solo creato i record non li blocca: restano, senza creatore
      await tx.task.updateMany({ where: { createdById: linkedUserId }, data: { createdById: null } })
      await tx.subtask.updateMany({ where: { createdById: linkedUserId }, data: { createdById: null } })
      await tx.client.updateMany({ where: { createdById: linkedUserId }, data: { createdById: null } })
      await tx.activityLog.updateMany({ where: { userId: linkedUserId }, data: { userId: null } })
      await tx.user.update({ where: { id: linkedUserId }, data: { teamMemberId: null } })
      await tx.user.delete({ where: { id: linkedUserId } })
    }
    await tx.teamMember.delete({ where: { id: params.id } })
  })

  return NextResponse.json({ ok: true })
}
