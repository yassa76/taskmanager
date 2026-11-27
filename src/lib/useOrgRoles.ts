'use client'

import { useEffect, useState } from 'react'

export interface OrgRoleOption {
  id: string
  name: string
  description: string | null
  parentId: string | null
  taskVisibility: string
  clientVisibility: string
  users: number
  depth: number
}

// Dispone i ruoli in ordine d'albero (padre, poi i figli) con la profondita' per l'indentazione.
export function orderTree<T extends { id: string; parentId: string | null; name: string }>(rows: T[]): (T & { depth: number })[] {
  const ids = new Set(rows.map((r) => r.id))
  const out: (T & { depth: number })[] = []
  const walk = (parent: string | null, depth: number) => {
    rows
      .filter((r) => (parent === null ? !r.parentId || !ids.has(r.parentId) : r.parentId === parent))
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((r) => {
        out.push({ ...r, depth })
        walk(r.id, depth + 1)
      })
  }
  walk(null, 0)
  return out
}

let cache: OrgRoleOption[] | null = null

export function clearOrgRolesCache() {
  cache = null
}

/** Ruoli aziendali (gerarchia) in ordine d'albero. */
export function useOrgRoles() {
  const [orgRoles, setOrgRoles] = useState<OrgRoleOption[]>(cache ?? [])
  useEffect(() => {
    if (cache) return
    fetch('/api/settings/org-roles')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.orgRoles) {
          cache = orderTree(d.orgRoles) as OrgRoleOption[]
          setOrgRoles(cache)
        }
      })
      .catch(() => {})
  }, [])
  return { orgRoles }
}
