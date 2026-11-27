import type { ReactNode } from 'react'

// Riga di strumenti uguale in tutte le pagine: a sinistra la scelta della vista (o una nota), a destra i pulsanti.
// Niente titolo: la pagina si riconosce dal menu e dalla sottovista, oppure dalle briciole.
export default function PageBar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 min-h-[2.25rem]">
      <div className="flex flex-wrap items-center gap-2 min-w-0">{left}</div>
      <div className="flex flex-wrap items-center gap-2">{right}</div>
    </div>
  )
}

// Pulsanti standard delle pagine: stessa misura ovunque.
export const BTN = 'inline-flex items-center gap-1.5 [&>svg]:text-brand-600 px-3 h-9 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100'
export const BTN_PRIMARY = 'px-3 h-9 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700'
