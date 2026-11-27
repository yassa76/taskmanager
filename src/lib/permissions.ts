import {
  permissionsFor,
  scopeIn,
  type ActionKey,
  type ObjectKey,
  type PermissionMap,
  type Scope
} from './permissionsShared'

// Il ruolo e' la "key" di un ruolo (admin, normal, read_only o uno creato dall'amministratore).
export type Role = string

export function getRole(session: any): Role {
  return (session?.user?.role as Role) || 'normal'
}

export function getUserId(session: any): string {
  return session?.user?.id || ''
}

// Permessi del ruolo dell'utente: li carica il callback della sessione (vedi auth.ts).
export function getPerms(session: any): PermissionMap {
  return (session?.user?.permissions as PermissionMap | undefined) ?? permissionsFor(getRole(session))
}

export function scopeOf(session: any, obj: ObjectKey, action: ActionKey): Scope {
  return scopeIn(getPerms(session), obj, action)
}

// True se l'utente puo' creare record di quel tipo
export function canCreate(session: any, obj: ObjectKey = 'task'): boolean {
  return scopeOf(session, obj, 'create') !== 'none'
}

function allowedOn(scope: Scope, isMine: boolean): boolean {
  return scope === 'all' || (scope === 'own' && isMine)
}

// True se l'utente puo' modificare un record specifico, secondo il suo ruolo:
// "Tutti" sempre, "Solo i miei" se e' l'owner (ownerId coincide), "No" mai.
export function canEditRecord(session: any, ownerId: string | null | undefined, obj: ObjectKey = 'task'): boolean {
  return allowedOn(scopeOf(session, obj, 'update'), !!ownerId && ownerId === getUserId(session))
}

export function canDeleteRecord(session: any, ownerId: string | null | undefined, obj: ObjectKey = 'task'): boolean {
  return allowedOn(scopeOf(session, obj, 'delete'), !!ownerId && ownerId === getUserId(session))
}

// True se l'utente puo' compiere quell'azione su un'entita' (usato soprattutto per le parti amministrative:
// visualizzare, creare, modificare, eliminare). Senza "Visualizzare" la sezione non compare e le API rispondono 403.
export function can(session: any, obj: ObjectKey, action: ActionKey): boolean {
  return scopeOf(session, obj, action) !== 'none'
}

// True solo per il profilo Admin di sistema (usato dove serve una visione completa del team, in attesa della visibilita' per ruolo)
export function isAdmin(session: any): boolean {
  return getRole(session) === 'admin'
}
