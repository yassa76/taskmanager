import provinceRegion from '@/data/it-province-region.json'

// Parti di geo.ts senza l'elenco di province/comuni, cosi' possono finire nel
// bundle del browser senza trascinarsi dietro il file dati (~100 KB).

// Paesi selezionabili a mano dalla tendina. Altri paesi possono comparire solo
// se arrivano dalla verifica dell'indirizzo (vedi countryLabel).
export const SUPPORTED_COUNTRIES = [
  { code: 'IT', label: 'Italia' },
  { code: 'SA', label: 'Arabia Saudita' },
  { code: 'AE', label: 'Emirati Arabi Uniti' },
  { code: 'DE', label: 'Germania' }
] as const

export function countryLabel(code: string | null | undefined): string {
  if (!code) return ''
  const found = SUPPORTED_COUNTRIES.find((c) => c.code === code)
  if (found) return found.label
  try {
    return new Intl.DisplayNames(['it'], { type: 'region' }).of(code) || code
  } catch {
    return code
  }
}

export interface GeocodeCandidate {
  formattedAddress: string
  address: string | null
  country: string | null
  province: string | null
  city: string | null
  postalCode: string | null
  /** Solo Italia: true se il comune e' presente nell'elenco ufficiale delle tendine. */
  cityKnown: boolean
  partialMatch: boolean
}

// Regione italiana (nome breve) a partire dalla sigla di provincia, es. RM -> Lazio.

export function regionOfProvince(sigla: string | null | undefined): string | null {
  if (!sigla) return null
  return (provinceRegion as Record<string, string>)[sigla.toUpperCase()] || null
}

// Regione di un cliente: solo per l'Italia con provincia valorizzata.
export function clientRegion(c: { country: string | null; province: string | null }): string | null {
  return c.country === 'IT' ? regionOfProvince(c.province) : null
}

// Elenco di tutti i paesi selezionabili dall'admin: i codici ISO a 2 lettere che il browser/Node
// sa nominare in italiano. Esclusi i codici speciali (Unione europea, ONU, "sconosciuto", ecc.).
const NOT_A_COUNTRY = new Set(['ZZ', 'EU', 'EZ', 'UN', 'XA', 'XB', 'QO', 'AC', 'CP', 'DG', 'EA', 'IC', 'TA'])

let allCountriesCache: { code: string; label: string }[] | null = null

export function allCountries(): { code: string; label: string }[] {
  if (allCountriesCache) return allCountriesCache
  const names = new Intl.DisplayNames(['it'], { type: 'region', fallback: 'none' })
  const list: { code: string; label: string }[] = []
  const A = 65
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j)
      if (NOT_A_COUNTRY.has(code)) continue
      let label: string | undefined
      try {
        label = names.of(code)
      } catch {
        label = undefined
      }
      if (label && label !== code) list.push({ code, label })
    }
  }
  list.sort((a, b) => a.label.localeCompare(b.label, 'it'))
  allCountriesCache = list
  return list
}

export function isValidCountryCode(code: unknown): code is string {
  return typeof code === 'string' && /^[A-Z]{2}$/.test(code) && allCountries().some((c) => c.code === code)
}
