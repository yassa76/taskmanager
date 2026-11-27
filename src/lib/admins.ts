import { prisma } from './prisma'

// Amministratori "attivi": profilo Admin e accesso non disattivato/rifiutato/in approvazione.
export async function countActiveAdmins(): Promise<number> {
  const admins = await prisma.user.findMany({ where: { role: 'admin' }, include: { teamMember: true } })
  return admins.filter((u) => !u.teamMember || !['inactive', 'rejected', 'pending'].includes(u.teamMember.status)).length
}

// Rete di sicurezza: se per qualsiasi motivo non esiste alcun amministratore, il primo utente registrato (il piu' vecchio)
// torna ad esserlo. Si chiama a ogni accesso.
export async function ensureAdminExists(): Promise<void> {
  if ((await countActiveAdmins()) > 0) return
  const first = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
  if (first) {
    await prisma.user.update({ where: { id: first.id }, data: { role: 'admin' } })
    if (first.teamMemberId) {
      await prisma.teamMember.updateMany({
        where: { id: first.teamMemberId, status: { in: ['inactive', 'rejected', 'pending'] } },
        data: { status: 'active' }
      })
    }
  }
}
