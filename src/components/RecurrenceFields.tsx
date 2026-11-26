'use client'

import { RECURRENCE_HELP, RECURRENCE_OPTIONS, RECURRENCE_SHORT } from '@/lib/recurrenceShared'

/**
 * Scelta "Singolo / Ricorrente" per un sub-task, con frequenza, data di fine facoltativa
 * e spiegazione (testo sempre visibile + tooltip sull'icona "i").
 * `recurrence` vuoto = sub-task singolo.
 */
export default function RecurrenceFields({
  recurrence,
  recurrenceEnd,
  onChange
}: {
  recurrence: string
  recurrenceEnd: string
  onChange: (recurrence: string, recurrenceEnd: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-slate-500">Tipo di sub-task</label>
        <span
          className="inline-flex w-4 h-4 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold cursor-help"
          title={RECURRENCE_HELP}
          aria-label="Come funzionano i sub-task ricorrenti"
        >
          i
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
        <select
          value={recurrence ? 'ricorrente' : 'singolo'}
          onChange={(e) => onChange(e.target.value === 'ricorrente' ? 'monthly' : '', recurrenceEnd)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="singolo">Singolo (non si ripete)</option>
          <option value="ricorrente">Ricorrente</option>
        </select>
        {recurrence && (
          <select
            value={recurrence}
            onChange={(e) => onChange(e.target.value, recurrenceEnd)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            title="Ogni quanto si ripete"
          >
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {recurrence && (
        <div className="mt-2 space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-500">Ripeti fino al (facoltativo)</label>
            <input
              type="date"
              value={recurrenceEnd}
              onChange={(e) => onChange(recurrence, e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm"
            />
          </div>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            {RECURRENCE_SHORT} Vengono copiati nome, dettagli e owner.
          </p>
        </div>
      )}
    </div>
  )
}
