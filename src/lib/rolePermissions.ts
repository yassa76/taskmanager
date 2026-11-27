import { prisma } from './prisma'
import { permissionsFor, sanitizePermissions, SYSTEM_ROLE_DEFAULTS, type PermissionMap } from './permissionsShared'

// Permessi di un ruolo, letti dalla tabella Role (con una piccola cache per non interrogare il database a ogni richiesta).
// Se la tabella non c'e' ancora o il ruolo non esiste, valgono i permessi predefiniti dei ruoli di sistema.
const cache = new Map<string, { at: number; perms: PermissionMap }>()
const TTL_MS = 15_000

export function clearRoleCache() {
  cache.clear()
}

export async function getRolePermissions(roleKey: string): Promise<PermissionMap> {
  // l'admin ha sempre tutto: non dipende dal database, cosi' nessuno puo' chiudersi fuori
  if (roleKey === 'admin') return permissionsFor('admin')
  const hit = cache.get(roleKey)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.perms
  let perms: PermissionMap
  try {
    const row = await prisma.role.findUnique({ where: { key: roleKey } })
    if (row) {
      let parsed: unknown = {}
      try {
        parsed = JSON.parse(row.permissions)
      } catch {}
      perms = sanitizePermissions(parsed)
    } else {
      perms = SYSTEM_ROLE_DEFAULTS[roleKey] ? permissionsFor(roleKey) : permissionsFor('read_only')
    }
  } catch {
    perms = SYSTEM_ROLE_DEFAULTS[roleKey] ? permissionsFor(roleKey) : permissionsFor('read_only')
  }
  cache.set(roleKey, { at: Date.now(), perms })
  return perms
}
