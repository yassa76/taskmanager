'use client'

import { useEffect, useMemo, useState } from 'react'
import Combobox from './Combobox'
import { useCan } from '@/lib/useCan'
import { allCountries } from '@/lib/geoShared'

interface CountryRow {
  code: string
  label: string
  inUse: number
}

export default function CountriesSettings() {
  const canEdit = useCan('countries', 'update')
  const [countries, setCountries] = useState<CountryRow[] | null>(null)
  const [toAdd, setToAdd] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/countries')
      .then((r) => r.json())
      .then((d) => setCountries(d.countries ?? []))
      .catch(() => setError('Impossibile caricare i paesi'))
  }, [])

  async function change(payload: { add?: string; remove?: string }) {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/settings/countries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(body.error || `Errore (status ${res.status})`)
      return
    }
    setCountries(body.countries)
    setToAdd('')
  }

  // paesi che si possono ancora aggiungere (tutti quelli del mondo meno quelli gia' presenti)
  const addable = useMemo(() => {
    const have = new Set((countries ?? []).map((c) => c.code))
    return allCountries()
      .filter((c) => !have.has(c.code))
      .map((c) => ({ id: c.code, label: c.label }))
  }, [countries])

  return (
    <fieldset disabled={!canEdit} className="bg-white border border-slate-200 rounded-xl p-5 max-w-2xl m-0 min-w-0 disabled:opacity-90">
      <h2 className="font-semibold text-slate-800">Paesi dei clienti</h2>
      <p className="text-sm text-slate-500 mt-1">
        Questi paesi compaiono nel menu &quot;Country&quot; del cliente. Provincia e città sono disponibili solo per l&apos;Italia;
        per gli altri paesi si sceglie solo il paese.
      </p>

      {!countries && !error && <p className="text-sm text-slate-400 mt-4">Caricamento...</p>}

      {countries && (
        <ul className="mt-4 divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {countries.map((c) => (
            <li key={c.code} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-slate-800">
                {c.label} <span className="text-slate-400">({c.code})</span>
                {c.inUse > 0 && (
                  <span className="ml-2 text-xs text-slate-500">
                    {c.inUse} {c.inUse === 1 ? 'cliente' : 'clienti'}
                  </span>
                )}
              </span>
              {c.code === 'IT' ? (
                <span className="text-xs text-slate-400" title="Provincia e comune dipendono dall'Italia">
                  sempre presente
                </span>
              ) : (
                <button
                  onClick={() => change({ remove: c.code })}
                  disabled={busy || c.inUse > 0}
                  title={c.inUse > 0 ? 'Usato da dei clienti: cambia prima il loro paese' : 'Togli dal menu'}
                  className="text-xs text-red-600 hover:underline disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
                >
                  Togli
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2 mt-4">
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500">Aggiungi un paese</label>
          <Combobox
            value={toAdd}
            onChange={setToAdd}
            options={addable}
            emptyLabel="— Scegli un paese —"
            placeholder="Cerca paese..."
            className="mt-1"
          />
        </div>
        <button
          onClick={() => toAdd && change({ add: toAdd })}
          disabled={busy || !toAdd}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          Aggiungi
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </fieldset>
  )
}
