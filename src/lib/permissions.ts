export type Role = 'admin' | 'normale' | 'sola_lettura'

export function getRole(session: any): Role {
  return (session?.user?.role as Role) || 'normale'
}

export function getUserId(session: any): string {
  return session?.user?.id || ''
}

// True se l'utente puo' creare nuovi record (task, cliente, sub-task, ecc.)
export function canCreate(session: any): boolean {
  return getRole(session) !== 'sola_lettura'
}

// True se l'utente puo' modificare/eliminare un record specifico:
// - admin: sempre
// - normale: solo se il record e' assegnato a lui (ownerId coincide)
// - sola_lettura: mai
export function canEditRecord(session: any, ownerId: string | null | undefined): boolean {
  const role = getRole(session)
  if (role === 'admin') return true
  if (role === 'sola_lettura') return false
  return !!ownerId && ownerId === getUserId(session)
}

// True se l'utente puo' gestire la sezione Team (invitare, cambiare ruoli/stato)
export function isAdmin(session: any): boolean {
  return getRole(session) === 'admin'
}
