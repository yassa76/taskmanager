'use client'

import { useEffect, useMemo, useState } from 'react'
import Combobox from './Combobox'
import { SUPPORTED_COUNTRIES, countryLabel, type GeocodeCandidate } from '@/lib/geoShared'

export interface LocationValue {
  address: string
  country: string
  province: string
  city: string
}

interface ItalianGeo {
  provinces: { sigla: string; nome: string }[]
  comuni: Record<string, string[]>
}

/**
 * Campi di posizione del cliente: indirizzo (con pulsante "Verifica indirizzo"),
 * country, provincia e citta'.
 * - Verifica indirizzo: una chiamata a Google, poi una tendina con i risultati.
 * - A mano: country da tendina; solo se e' Italia si attivano provincia e comune
 *   (il comune dipende dalla provincia). Per gli altri paesi restano in grigio.
 */
export default function ClientLocationFields({
  value,
  onChange
}: {
  value: LocationValue
  onChange: (next: LocationValue) => void
}) {
  const [geo, setGeo] = useState<ItalianGeo | null>(null)
  const [checking, setChecking] = useState(false)
  const [candidates, setCandidates] = useState<GeocodeCandidate[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // Paesi selezionabili: li gestisce l'admin dalle Impostazioni; finche' non arrivano, quelli iniziali
  const [countryList, setCountryList] = useState<{ code: string; label: string }[]>(
    SUPPORTED_COUNTRIES.map((c) => ({ code: c.code, label: c.label }))
  )

  useEffect(() => {
    fetch('/api/settings/countries')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.countries?.length) setCountryList(d.countries.map((c: any) => ({ code: c.code, label: c.label })))
      })
      .catch(() => {})
  }, [])

  const isItaly = value.country === 'IT'

  // L'elenco di province e comuni pesa ~100 KB: lo scarichiamo solo se serve.
  useEffect(() => {
    if (!isItaly || geo) return
    import('@/data/it-geo.json').then((mod) => {
      setGeo(((mod as any).default ?? mod) as ItalianGeo)
    })
  }, [isItaly, geo])

  const provinceOptions = useMemo(
    () => (geo ? geo.provinces.map((p) => ({ id: p.sigla, label: `${p.nome} (${p.sigla})` })) : []),
    [geo]
  )

  const cityOptions = useMemo(() => {
    const list = geo && value.province ? geo.comuni[value.province] || [] : []
    const options = list.map((c) => ({ id: c, label: c }))
    // Comune arrivato da Google ma assente dall'elenco: lo teniamo selezionabile.
    if (value.city && !list.includes(value.city)) options.unshift({ id: value.city, label: value.city })
    return options
  }, [geo, value.province, value.city])

  const countryOptions = useMemo(() => {
    const list = [...countryList]
    if (value.country && !list.some((c) => c.code === value.country)) {
      list.push({ code: value.country, label: countryLabel(value.country) })
    }
    return list
  }, [value.country, countryList])

  function changeCountry(code: string) {
    if (code === value.country) return
    // Provincia e citta' dipendono dal paese: cambiando paese si azzerano.
    onChange({ ...value, country: code, province: '', city: '' })
    setCandidates(null)
    setMessage(null)
  }

  async function verifyAddress() {
    setChecking(true)
    setMessage(null)
    setCandidates(null)
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: value.address, country: value.country || undefined })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || `Errore nella verifica (status ${res.status})`)
        return
      }
      const found: GeocodeCandidate[] = data.candidates || []
      if (found.length === 0) setMessage('Nessun indirizzo trovato. Controlla il testo o compila i campi a mano.')
      setCandidates(found)
    } catch (e: any) {
      setMessage(`Errore imprevisto: ${e?.message || e}`)
    } finally {
      setChecking(false)
    }
  }

  function pick(c: GeocodeCandidate) {
    onChange({
      address: c.address || value.address,
      country: c.country || value.country,
      province: c.province || '',
      city: c.city || ''
    })
    setCandidates(null)
    setMessage(
      c.country === 'IT' && c.city && !c.cityKnown
        ? 'Indirizzo compilato. Il comune non è nell\'elenco ufficiale: è stato mantenuto come indicato da Google.'
        : null
    )
  }

  const inputClass = 'w-full border border-slate-200 rounded-lg px-3 py-2 mt-1'
  const disabledClass = 'w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 bg-slate-100 text-slate-400'

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-500">Indirizzo</label>
        <div className="flex gap-2 mt-1">
          <input
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            placeholder="Via, numero civico, città"
            className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2"
          />
          <button
            type="button"
            onClick={verifyAddress}
            disabled={checking || value.address.trim().length < 5}
            title="Cerca l'indirizzo con Google Maps e compila automaticamente paese, provincia e città. Il servizio ha un limite di utilizzo mensile."
            className="shrink-0 px-3 py-2 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 text-sm font-medium hover:bg-brand-100 disabled:opacity-50"
          >
            {checking ? 'Verifico...' : 'Verifica indirizzo'}
          </button>
        </div>

        {candidates && candidates.length > 0 && (
          <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
            <p className="px-3 py-1.5 text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
              Scegli l&apos;indirizzo corretto
            </p>
            {candidates.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(c)}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-brand-50 border-b border-slate-100 last:border-b-0"
              >
                {c.formattedAddress}
                {c.partialMatch && <span className="ml-2 text-xs text-amber-600">corrispondenza parziale</span>}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCandidates(null)}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50"
            >
              Nessuno di questi: compilo a mano
            </button>
          </div>
        )}
        {message && <p className="text-xs text-amber-600 mt-1">{message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Country</label>
          <select
            value={value.country}
            onChange={(e) => changeCountry(e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {countryOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">Provincia</label>
          {isItaly ? (
            <Combobox
              value={value.province}
              onChange={(sigla) => {
                if (sigla === value.province) return
                onChange({ ...value, province: sigla, city: '' })
              }}
              options={provinceOptions}
              emptyLabel="—"
              placeholder="Cerca provincia..."
              className="mt-1"
            />
          ) : (
            <input value={value.province} disabled readOnly className={disabledClass} />
          )}
        </div>

        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-500">Città</label>
          {isItaly ? (
            value.province ? (
              <Combobox
                value={value.city}
                onChange={(c) => onChange({ ...value, city: c })}
                options={cityOptions}
                emptyLabel="—"
                placeholder="Cerca comune..."
                className="mt-1"
              />
            ) : (
              <input value="" disabled readOnly placeholder="Scegli prima la provincia" className={disabledClass} />
            )
          ) : (
            <input value={value.city} disabled readOnly className={disabledClass} />
          )}
        </div>
      </div>
      {value.country && !isItaly && (
        <p className="text-xs text-slate-400">
          Provincia e città si compilano solo per l&apos;Italia o con &quot;Verifica indirizzo&quot;.
        </p>
      )}
    </div>
  )
}
