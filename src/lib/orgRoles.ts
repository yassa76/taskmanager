import { prisma } from './prisma'

// Aiuti per l'albero dei ruoli aziendali.

export interface OrgRoleRow {
  id: string
  parentId: string | null
}

// Ruoli sotto un dato ruolo (figli, nipoti...), escluso il ruolo stesso.
export function descendantIds(rows: OrgRoleRow[], rootId: string): string[] {
  const byParent = new Map<string, string[]>()
  for (const r of rows) {
    if (!r.parentId) continue
    byParent.set(r.parentId, [...(byParent.get(r.parentId) ?? []), r.id])
  }
  const out: string[] = []
  const stack = [...(byParent.get(rootId) ?? [])]
  while (stack.length) {
    const id = stack.pop()!
    if (out.includes(id)) continue
    out.push(id)
    stack.push(...(byParent.get(id) ?? []))
  }
  return out
}

export async function loadOrgRoleRows(): Promise<OrgRoleRow[]> {
  return prisma.orgRole.findMany({ select: { id: true, parentId: true } }).catch(() => [])
}
