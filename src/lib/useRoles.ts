'use client'

import { useEffect, useState } from 'react'

export interface RoleOption {
  key: string
  name: string
  isSystem: boolean
}

const FALLBACK: RoleOption[] = [
  { key: 'admin', name: 'Admin', isSystem: true },
  { key: 'normal', name: 'Normale', isSystem: true },
  { key: 'read_only', name: 'Sola lettura', isSystem: true }
]

let cache: RoleOption[] | null = null

/** Profili disponibili (di sistema e personalizzati) con il loro nome, per etichette e menu. */
export function useRoles() {
  const [roles, setRoles] = useState<RoleOption[]>(cache ?? FALLBACK)
  useEffect(() => {
    if (cache) return
    fetch('/api/settings/roles')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.roles) {
          cache = d.roles
          setRoles(d.roles)
        }
      })
      .catch(() => {})
  }, [])
  const labelOf = (key: string | null | undefined) => roles.find((r) => r.key === key)?.name ?? key ?? 'Normale'
  return { roles, labelOf }
}

export function clearRolesCache() {
  cache = null
}
