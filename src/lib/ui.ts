// Stile comune dei menu dei filtri: grigio quando e' "tutti" (nessun filtro), scuro quando un filtro e' attivo.
export function filterSelectClass(value: string): string {
  return `border border-slate-200 rounded-lg px-3 h-9 text-sm bg-white ${value ? 'text-slate-800' : 'text-slate-500'}`
}

// Menu delle viste (miei / team / tutti / personalizzate): stessa misura in tutta l'app.
export const VIEW_SELECT = 'border border-slate-300 rounded-lg px-2 h-9 bg-white text-sm text-slate-700 w-48 max-w-full'
