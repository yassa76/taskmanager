'use client'

import { useEffect, useState } from 'react'

// Selettore "conserva per N giorni" di un registro; il cambio vale subito per le pulizie successive.
export default function RetentionSelect({ kind }: { kind: 'access' | 'activity' }) {
  const [days, setDays] = useState<number | null>(null)
  const [options, setOptions] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/retention')
      .then((r) => r.json())
      .then((d) => {
        setDays(d[kind])
        setOptions(d.options || [])
      })
      .catch(() => {})
  }, [kind])

  async function change(v: number) {
    setError(null)
    const res = await fetch('/api/settings/retention', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, days: v })
    })
    if (res.ok) setDays(v)
    else setError('Non salvato')
  }

  if (days === null) return null
  return (
    <p className="text-sm text-slate-500 mt-2">
      Conserva per{' '}
      <select
        value={days}
        onChange={(e) => change(Number(e.target.value))}
        className="border border-slate-300 rounded px-2 py-0.5 text-sm bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o} giorni
          </option>
        ))}
      </select>
      : le righe più vecchie vengono cancellate in automatico (una volta al giorno).
      {error && <span className="text-red-600 ml-2">{error}</span>}
    </p>
  )
}
