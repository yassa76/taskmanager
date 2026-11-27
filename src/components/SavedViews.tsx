'use client'

import { VIEW_SELECT } from '@/lib/ui'
import { useEffect, useState } from 'react'
import { SCOPE_LABELS, type ViewScope } from '@/lib/scopesShared'

interface View<T> {
  id: string
  name: string
  data: T
}

/**
 * Menu delle viste: in alto quelle standard (miei record, del mio team, tutti, secondo il ruolo),
 * poi quelle personalizzate dell'utente. Scegliendone una si riapplicano filtri e ordinamento;
 * si puo' salvare la vista attuale con un nome ed eliminare quelle che non servono.
 */
export default function SavedViews<T>({
  page,
  current,
  onApply,
  scopes,
  scope,
  onScope
}: {
  page: string
  current: T
  onApply: (data: T) => void
  scopes?: ViewScope[]
  scope?: ViewScope
  onScope?: (v: ViewScope) => void
}) {
  const [views, setViews] = useState<View<T>[]>([])
  const [activeId, setActiveId] = useState('')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/profile/views')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setViews((d.views?.[page] as View<T>[]) || []))
      .catch(() => {})
  }, [page])

  async function put(body: Record<string, unknown>) {
    const res = await fetch('/api/profile/views', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, ...body })
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(d.error || 'Errore nel salvataggio')
      return false
    }
    setViews((d.views?.[page] as View<T>[]) || [])
    return true
  }

  async function save() {
    if (!name.trim()) return
    setError('')
    if (await put({ name: name.trim(), data: current })) {
      setSaving(false)
      setName('')
    }
  }

  const active = views.find((v) => v.id === activeId)

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <select
        value={activeId || (scope ? `std:${scope}` : '')}
        onChange={(e) => {
          const val = e.target.value
          if (val.startsWith('std:')) {
            setActiveId('')
            onScope?.(val.slice(4) as ViewScope)
            return
          }
          setActiveId(val)
          const v = views.find((x) => x.id === val)
          if (v) onApply(v.data)
        }}
        className={VIEW_SELECT}
        aria-label="Viste"
      >
        {scopes && scopes.length > 0 && (
          <optgroup label="Standard">
            {scopes.map((sc) => (
              <option key={sc} value={`std:${sc}`}>
                {SCOPE_LABELS[sc]}
              </option>
            ))}
          </optgroup>
        )}
        {views.length > 0 && (
          <optgroup label="Le mie viste">
            {views.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </optgroup>
        )}
        {!scopes && <option value="">Viste salvate{views.length ? ` (${views.length})` : ''}</option>}
      </select>
      {active && (
        <button
          onClick={async () => {
            if (!confirm(`Eliminare la vista "${active.name}"?`)) return
            await put({ deleteId: active.id })
            setActiveId('')
          }}
          title="Elimina questa vista"
          aria-label="Elimina questa vista"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
          </svg>
        </button>
      )}
      {saving ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Nome della vista"
            maxLength={40}
            className="border border-slate-300 rounded-lg px-2 h-9"
          />
          <button onClick={save} className="px-2 h-9 rounded-lg bg-brand-600 text-white text-xs font-medium">
            Salva
          </button>
          <button onClick={() => setSaving(false)} className="px-2 h-9 text-xs text-slate-500">
            Annulla
          </button>
        </span>
      ) : (
        <button
          onClick={() => setSaving(true)}
          title="Salva la vista attuale (filtri e ordinamento)"
          aria-label="Salva la vista attuale"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12v18l-6-4-6 4V3z" />
            <path d="M12 7v6M9 10h6" />
          </svg>
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
