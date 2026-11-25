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
