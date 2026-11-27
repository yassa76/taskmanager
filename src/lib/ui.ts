// Stile comune dei menu dei filtri: grigio quando e' "tutti" (nessun filtro), scuro quando un filtro e' attivo.
export function filterSelectClass(value: string): string {
  return `border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white ${value ? 'text-slate-800' : 'text-slate-500'}`
}
