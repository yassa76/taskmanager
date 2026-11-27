'use client'

import { SCOPE_LABELS, type ViewScope } from '@/lib/scopesShared'
import { useScopes } from '@/lib/useScopes'

// Menu delle viste standard (miei / del mio team / tutti) per le pagine senza viste personalizzate (Home, Report).
// Compare solo se c'e' una scelta da fare.
export default function ScopeSelect({ value, onChange }: { value: ViewScope; onChange: (v: ViewScope) => void }) {
  const scopes = useScopes(true)
  if (scopes.length < 2) return null
  const current = scopes.includes(value) ? value : scopes[scopes.length - 1]
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value as ViewScope)}
      aria-label="Vista"
      className="border border-slate-300 rounded-lg px-2 h-9 bg-white text-sm text-slate-700"
    >
      {scopes.map((s) => (
        <option key={s} value={s}>
          {SCOPE_LABELS[s]}
        </option>
      ))}
    </select>
  )
}
