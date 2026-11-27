'use client'

import clsx from 'clsx'

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
      <ol className="flex flex-1 min-w-[260px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium">
        {STEPS.map((s, i) => {
          const done = !cancelled && i < idx
          const current = !cancelled && i === idx
          return (
            <li key={s.key} className="flex-1">
              <button
                type="button"
                disabled={disabled || !onChange || s.key === status}
                onClick={() => onChange?.(s.key)}
                className={clsx(
                  'w-full px-3 py-2 text-center transition-colors border-r border-slate-200 last:border-r-0',
                  current && 'bg-brand-600 text-white',
                  done && 'bg-brand-50 text-brand-700',
                  !current && !done && 'text-slate-500',
                  onChange && !disabled && !current && 'hover:bg-slate-100 cursor-pointer',
                  (!onChange || disabled || current) && 'cursor-default'
                )}
                title={onChange && !current ? `Imposta "${s.label}"` : undefined}
              >
                {done ? '✓ ' : ''}
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
