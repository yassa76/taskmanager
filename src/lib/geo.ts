import itGeo from '@/data/it-geo.json'

export { SUPPORTED_COUNTRIES, countryLabel } from './geoShared'
export type { GeocodeCandidate } from './geoShared'

// Confronto "tollerante": senza maiuscole, accenti, apostrofi tipografici e spazi doppi.
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export interface ItalianProvince {
  sigla: string
  nome: string
}

const provinces = itGeo.provinces as ItalianProvince[]
const comuni = itGeo.comuni as Record<string, string[]>

export function isItalianProvince(sigla: string | null | undefined): boolean {
  return !!sigla && provinces.some((p) => p.sigla === sigla)
}

/** Sigla di provincia a partire da sigla o nome ("MI", "Milano", "Città Metropolitana di Milano"). */
export function resolveProvinceSigla(value: string | null | undefined): string | null {
  if (!value) return null
  const v = value.trim()
  const bySigla = provinces.find((p) => p.sigla === v.toUpperCase())
  if (bySigla) return bySigla.sigla
  const n = normalizeName(v)
  const exact = provinces.find((p) => normalizeName(p.nome) === n)
  if (exact) return exact.sigla
  // "Città Metropolitana di Milano", "Provincia di Lecco", "Metropolitan City of Milan"...
  const contained = provinces.find((p) => {
    const parts = p.nome.split('/').map(normalizeName)
    return parts.some((part) => part.length > 3 && n.includes(part))
  })
  return contained ? contained.sigla : null
}

/** Nome ufficiale del comune dentro la provincia, se esiste (altrimenti null). */
export function matchItalianCity(sigla: string | null | undefined, city: string | null | undefined): string | null {
  if (!sigla || !city) return null
  const list = comuni[sigla]
  if (!list) return null
  const n = normalizeName(city)
  const direct = list.find((c) => normalizeName(c) === n)
  if (direct) return direct
  // Comuni bilingui, es. "Bolzano/Bozen": accetta anche solo una delle due parti.
  const partial = list.find((c) => c.includes('/') && c.split('/').some((part) => normalizeName(part) === n))
  return partial || null
}

export interface LocationFields {
  address?: string | null
  country?: string | null
  province?: string | null
  city?: string | null
}

/** Estrae e pulisce i campi di posizione da un body JSON (campo assente = undefined = non toccare). */
export function pickLocation(body: any): LocationFields {
  const text = (v: unknown, max: number): string | null | undefined => {
    if (v === undefined) return undefined
    if (typeof v !== 'string') return null
    const t = v.trim().slice(0, max)
    return t || null
  }
  const country = (() => {
    if (body.country === undefined) return undefined
    if (typeof body.country !== 'string') return null
    const c = body.country.trim().toUpperCase()
    return /^[A-Z]{2}$/.test(c) ? c : null
  })()
  return {
    address: text(body.address, 200),
    country,
    province: text(body.province, 100),
    city: text(body.city, 100)
  }
}
