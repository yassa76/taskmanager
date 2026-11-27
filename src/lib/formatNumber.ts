// Numeri con il punto come separatore delle migliaia (1.234.567), sempre, anche per i numeri a quattro cifre
// (toLocaleString('it-IT') da solo scrive 1234 senza punto).
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return ''
  const [int, dec] = String(n).split('.')
  const sign = int.startsWith('-') ? '-' : ''
  const digits = sign ? int.slice(1) : int
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return sign + grouped + (dec ? ',' + dec : '')
}
