import { prisma } from './prisma'
import { SUPPORTED_COUNTRIES, countryLabel } from './geoShared'

const KEY = 'countries'
const DEFAULT_CODES: string[] = SUPPORTED_COUNTRIES.map((c) => c.code)

// L'Italia c'e' sempre: provincia e comune dipendono da lei.
function normalize(codes: string[]): string[] {
  return Array.from(new Set(['IT', ...codes]))
}

/** Codici dei paesi selezionabili nel modulo cliente (default: quelli iniziali). */
export async function getCountryCodes(): Promise<string[]> {
  const row = await prisma.appSetting.findUnique({ where: { key: KEY } })
  if (!row) return DEFAULT_CODES
  try {
    const parsed = JSON.parse(row.value)
    if (Array.isArray(parsed)) return normalize(parsed.filter((c) => typeof c === 'string'))
  } catch {}
  return DEFAULT_CODES
}

export async function saveCountryCodes(codes: string[]): Promise<void> {
  const value = JSON.stringify(normalize(codes))
  await prisma.appSetting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } })
}

/** Elenco con etichetta e numero di clienti che usano ogni paese; Italia per prima, poi in ordine alfabetico. */
export async function getCountriesWithUsage() {
  const [codes, usage] = await Promise.all([
    getCountryCodes(),
    prisma.client.groupBy({ by: ['country'], _count: { _all: true }, where: { country: { not: null } } })
  ])
  const used = new Map<string, number>()
  for (const u of usage) if (u.country) used.set(u.country, u._count._all)
  return codes
    .map((code) => ({ code, label: countryLabel(code), inUse: used.get(code) ?? 0 }))
    .sort((a, b) => (a.code === 'IT' ? -1 : b.code === 'IT' ? 1 : a.label.localeCompare(b.label, 'it')))
}
