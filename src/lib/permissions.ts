export type Role = 'admin' | 'normal' | 'read_only'

export function getRole(session: any): Role {
  return (session?.user?.role as Role) || 'normal'
}

export function getUserId(session: any): string {
  return session?.user?.id || ''
}

// True se l'utente puo' creare nuovi record (task, cliente, sub-task, ecc.)
export function canCreate(session: any): boolean {
  return getRole(session) !== 'read_only'
}

// True se l'utente puo' modificare/eliminare un record specifico:
// - admin: sempre
// - normal: solo se il record e' assegnato a lui (ownerId coincide)
// - read_only: mai
export function canEditRecord(session: any, ownerId: string | null | undefined): boolean {
  const role = getRole(session)
  if (role === 'admin') return true
  if (role === 'read_only') return false
  return !!ownerId && ownerId === getUserId(session)
}

// True se l'utente puo' gestire la sezione Team (invitare, cambiare ruoli/stato)
export function isAdmin(session: any): boolean {
  return getRole(session) === 'admin'
}
