// Fuso orario scelto nel profilo; da qui si ricava il formato locale (separatori di numeri, formato di date e orari).
export interface TzOption {
  tz: string
  label: string
  locale: string
}

export const DEFAULT_TZ = 'Europe/Rome'

export const TIMEZONES: TzOption[] = [
  { tz: 'Europe/Rome', label: 'Italia (Roma)', locale: 'it-IT' },
  { tz: 'Europe/London', label: 'Regno Unito (Londra)', locale: 'en-GB' },
  { tz: 'Europe/Dublin', label: 'Irlanda (Dublino)', locale: 'en-IE' },
  { tz: 'Europe/Paris', label: 'Francia (Parigi)', locale: 'fr-FR' },
  { tz: 'Europe/Berlin', label: 'Germania (Berlino)', locale: 'de-DE' },
  { tz: 'Europe/Vienna', label: 'Austria (Vienna)', locale: 'de-AT' },
  { tz: 'Europe/Madrid', label: 'Spagna (Madrid)', locale: 'es-ES' },
  { tz: 'Europe/Lisbon', label: 'Portogallo (Lisbona)', locale: 'pt-PT' },
  { tz: 'Europe/Amsterdam', label: 'Paesi Bassi (Amsterdam)', locale: 'nl-NL' },
  { tz: 'Europe/Brussels', label: 'Belgio (Bruxelles)', locale: 'nl-BE' },
  { tz: 'Europe/Athens', label: 'Grecia (Atene)', locale: 'el-GR' },
  { tz: 'Europe/Warsaw', label: 'Polonia (Varsavia)', locale: 'pl-PL' },
  { tz: 'Europe/Stockholm', label: 'Svezia (Stoccolma)', locale: 'sv-SE' },
  { tz: 'Europe/Moscow', label: 'Russia (Mosca)', locale: 'ru-RU' },
  { tz: 'America/New_York', label: 'USA – Est (New York)', locale: 'en-US' },
  { tz: 'America/Chicago', label: 'USA – Centro (Chicago)', locale: 'en-US' },
  { tz: 'America/Denver', label: 'USA – Montagne (Denver)', locale: 'en-US' },
  { tz: 'America/Los_Angeles', label: 'USA – Pacifico (Los Angeles)', locale: 'en-US' },
  { tz: 'America/Toronto', label: 'Canada (Toronto)', locale: 'en-CA' },
  { tz: 'America/Mexico_City', label: 'Messico (Città del Messico)', locale: 'es-MX' },
  { tz: 'America/Sao_Paulo', label: 'Brasile (San Paolo)', locale: 'pt-BR' },
  { tz: 'Asia/Dubai', label: 'Emirati Arabi (Dubai)', locale: 'en-AE' },
  { tz: 'Asia/Kolkata', label: 'India (Calcutta)', locale: 'en-IN' },
  { tz: 'Asia/Shanghai', label: 'Cina (Shanghai)', locale: 'zh-CN' },
  { tz: 'Asia/Tokyo', label: 'Giappone (Tokyo)', locale: 'ja-JP' },
  { tz: 'Australia/Sydney', label: 'Australia (Sydney)', locale: 'en-AU' },
  { tz: 'UTC', label: 'UTC', locale: 'en-GB' }
]

export function isValidTz(tz: unknown): tz is string {
  return typeof tz === 'string' && TIMEZONES.some((t) => t.tz === tz)
}

export function localeForTz(tz: string): string {
  return TIMEZONES.find((t) => t.tz === tz)?.locale ?? 'it-IT'
}

// Stato corrente: lo imposta LocaleInit all'avvio della pagina (dal cookie "tz") e lo legge il resto dell'app.
let currentTz = DEFAULT_TZ

export function setTimeZone(tz: string) {
  currentTz = isValidTz(tz) ? tz : DEFAULT_TZ
}
export function getTimeZone() {
  return currentTz
}
export function getLocale() {
  return localeForTz(currentTz)
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return ''
  // useGrouping 'always': anche 1234 diventa 1.234 (con 'auto' alcune lingue, come l'italiano, non raggruppano le 4 cifre)
  const opts = { useGrouping: 'always', maximumFractionDigits: 20 } as unknown as Intl.NumberFormatOptions
  return new Intl.NumberFormat(getLocale(), opts).format(n)
}

// Data senza orario (AAAA-MM-GG): nessuna conversione di fuso, solo il formato.
export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return '—'
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(getLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'UTC'
  })
}

// Data e ora (istante): convertita nel fuso scelto.
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(getLocale(), { dateStyle: 'short', timeStyle: 'short', timeZone: getTimeZone() })
}
