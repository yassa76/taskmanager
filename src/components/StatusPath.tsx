'use client'

import clsx from 'clsx'
import { CheckIcon } from './icons'

const STEPS: { key: string; label: string }[] = [
  { key: 'da_avviare', label: 'Da avviare' },
  { key: 'in_corso', label: 'In corso' },
  { key: 'completato', label: 'Completato' }
]

/**
 * Barra di avanzamento dello stato (stile "path"). Se onChange e' presente
 * i passaggi sono cliccabili. "Annullato" viene mostrato come badge a parte.
 */
export default function StatusPath({
  status,
  onChange,
  disabled,
  restoreTo = 'auto'
}: {
  status: string
  onChange?: (status: string) => void
  disabled?: boolean
  /** stato da impostare quando si ripristina un annullato ('auto' per i task) */
  restoreTo?: string
}) {
  const idx = STEPS.findIndex((s) => s.key === status)
  const cancelled = status === 'annullato'
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <ol className="flex flex-1 min-w-[260px] text-xs font-medium" aria-label="Stato">
        {STEPS.map((s, i) => {
          const done = !cancelled && i < idx
          const current = !cancelled && i === idx
          const first = i === 0
          // punta a destra su tutti i passaggi; dal secondo in poi c'e' l'incavo a sinistra in cui si incastra la punta del precedente
          const clip = first
            ? 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)'
            : 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)'
          return (
            <li key={s.key} className={clsx('flex-1', !first && '-ml-[12px]')}>
              <button
                type="button"
                disabled={disabled || !onChange || s.key === status}
                onClick={() => onChange?.(s.key)}
                style={{ clipPath: clip }}
                className={clsx(
                  'w-full h-9 pl-6 pr-5 text-center transition-colors inline-flex items-center justify-center gap-1',
                  current && 'bg-brand-600 text-white',
                  done && 'bg-brand-100 text-brand-700',
                  !current && !done && 'bg-slate-100 text-slate-500',
                  onChange && !disabled && !current && 'hover:bg-brand-50 cursor-pointer',
                  (!onChange || disabled || current) && 'cursor-default'
                )}
                title={onChange && !current ? `Imposta "${s.label}"` : undefined}
              >
                {done && <CheckIcon className="w-3.5 h-3.5" />}
                {s.label}
              </button>
            </li>
          )
        })}
      </ol>
      {onChange && !disabled && (
        <button
          type="button"
          onClick={() => onChange(cancelled ? restoreTo : 'annullato')}
          className="text-xs text-slate-500 hover:text-brand-600"
          title={cancelled ? 'Ripristina lo stato automatico' : 'Segna come annullato'}
        >
          {cancelled ? 'Annullato · ripristina' : 'Annulla task'}
        </button>
      )}
      {!onChange && cancelled && <span className="text-xs text-slate-500">Annullato</span>}
    </div>
  )
}
