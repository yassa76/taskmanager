export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const datePart = dateStr.slice(0, 10)
  const [y, m, d] = datePart.split('-')
  if (!y || !m || !d) return '—'
  return `${d}/${m}/${y.slice(2)}`
}
