// Utilita' sul testo dei commenti, senza dipendenze server (usabili anche nel browser).
// Le menzioni nel testo salvato hanno la forma @[Nome](idUtente).

export const MENTION_RE = /@\[([^\]]*)\]\(([^)]+)\)/g

export function extractMentionIds(body: string): string[] {
  const ids = new Set<string>()
  for (const m of Array.from(body.matchAll(MENTION_RE))) ids.add(m[2])
  return Array.from(ids)
}

// Testo "leggibile": @[Mario Rossi](abc) -> @Mario Rossi
export function plainBody(body: string): string {
  return body.replace(MENTION_RE, '@$1')
}

export type BodyPart = { type: 'text'; text: string } | { type: 'mention'; name: string; userId: string }

export function splitBody(body: string): BodyPart[] {
  const parts: BodyPart[] = []
  let last = 0
  for (const m of Array.from(body.matchAll(MENTION_RE))) {
    const idx = m.index ?? 0
    if (idx > last) parts.push({ type: 'text', text: body.slice(last, idx) })
    parts.push({ type: 'mention', name: m[1], userId: m[2] })
    last = idx + m[0].length
  }
  if (last < body.length) parts.push({ type: 'text', text: body.slice(last) })
  return parts
}
