'use client'

import { useEffect, useState } from 'react'

interface View<T> {
  id: string
  name: string
  data: T
}

/**
 * Viste salvate per utente: scegli una vista dall'elenco per riapplicare filtri e ordinamento,
 * salva quella attuale con un nome, elimina quelle che non servono.
 */
export default function SavedViews<T>({
  page,
  current,
  onApply
}: {
  page: string
  current: T
  onApply: (data: T) => void
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
    <div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
      <select
        value={activeId}
        onChange={(e) => {
          setActiveId(e.target.value)
          const v = views.find((x) => x.id === e.target.value)
          if (v) onApply(v.data)
        }}
        className="border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700"
        aria-label="Viste salvate"
      >
        <option value="">Viste salvate{views.length ? ` (${views.length})` : ''}</option>
        {views.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      {active && (
        <button
          onClick={async () => {
            if (!confirm(`Eliminare la vista "${active.name}"?`)) return
            await put({ deleteId: active.id })
            setActiveId('')
          }}
          className="text-xs text-slate-500 hover:text-red-600"
        >
          Elimina vista
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
            className="border border-slate-300 rounded-lg px-2 py-1.5"
          />
          <button onClick={save} className="px-2 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium">
            Salva
          </button>
          <button onClick={() => setSaving(false)} className="px-2 py-1.5 text-xs text-slate-500">
            Annulla
          </button>
        </span>
      ) : (
        <button onClick={() => setSaving(true)} className="text-xs text-brand-600 hover:underline">
          + Salva vista attuale
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
