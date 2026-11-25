'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import Breadcrumbs from './Breadcrumbs'
import CountriesSettings from './CountriesSettings'

interface GeocodeSettings {
  dailyLimit: number
  monthlyLimit: number
  usedToday: number
  usedMonth: number
  freeMonthlyCap: number
  keyConfigured: boolean
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">
          {used.toLocaleString('it-IT')} / {limit.toLocaleString('it-IT')}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
        <div
          className={clsx('h-2 rounded-full', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function SettingsView() {
  const [data, setData] = useState<GeocodeSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [daily, setDaily] = useState('')
  const [monthly, setMonthly] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/geocode')
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || `Errore nel caricare le impostazioni (status ${res.status})`)
        return
      }
      setData(body)
      setDaily(String(body.dailyLimit))
      setMonthly(String(body.monthlyLimit))
    } catch (e: any) {
      setError(`Errore imprevisto: ${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)
    const res = await fetch('/api/settings/geocode', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyLimit: Number(daily), monthlyLimit: Number(monthly) })
    })
    const body = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setError(body.error || `Errore nel salvataggio (status ${res.status})`)
      return
    }
    setData(body)
    setDaily(String(body.dailyLimit))
    setMonthly(String(body.monthlyLimit))
    setSaved(true)
  }

  if (loading) return <p className="text-slate-400">Caricamento...</p>
  if (!data) return <p className="text-red-500">{error || 'Impostazioni non disponibili.'}</p>

  const dirty = daily !== String(data.dailyLimit) || monthly !== String(data.monthlyLimit)
  const tooltip =
    `Google Maps è gratuito solo fino a ${data.freeMonthlyCap.toLocaleString('it-IT')} richieste al mese per la verifica degli indirizzi: ` +
    `oltre questa soglia costa circa 5 $ ogni 1.000 richieste. ` +
    `Per evitare costi, l'app blocca il pulsante "Verifica indirizzo" quando raggiunge uno dei due limiti. ` +
    `Il limite mensile non può superare ${data.freeMonthlyCap.toLocaleString('it-IT')}. ` +
    `I conteggi seguono il fuso orario del Pacifico, come Google, e riguardano solo le richieste fatte da questa app.`

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Impostazioni' }]} />
      <h1 className="text-xl font-bold text-slate-800 mb-4">Impostazioni</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-2xl">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h2 className="font-semibold text-slate-800">Verifica indirizzi (Google Maps)</h2>
          <span className="relative group">
            <button
              type="button"
              aria-label="Perché ci sono dei limiti"
              className="w-5 h-5 rounded-full border border-slate-300 text-slate-500 text-xs font-bold flex items-center justify-center hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              i
            </button>
            <span className="pointer-events-none absolute left-0 top-7 z-30 hidden group-hover:block group-focus-within:block w-72 rounded-lg bg-slate-800 text-white text-xs p-3 shadow-lg">
              {tooltip}
            </span>
          </span>
          <span
            className={clsx(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              data.keyConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            )}
          >
            {data.keyConfigured ? 'Chiave configurata' : 'Chiave mancante'}
          </span>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Quante volte al giorno e al mese gli utenti possono usare il pulsante &quot;Verifica indirizzo&quot; nelle schede
          dei clienti.
          {!data.keyConfigured && ' La chiave si imposta su Vercel con la variabile GOOGLE_MAPS_API_KEY.'}
        </p>

        <div className="space-y-3 mb-5">
          <UsageBar label="Oggi" used={data.usedToday} limit={data.dailyLimit} />
          <UsageBar label="Questo mese" used={data.usedMonth} limit={data.monthlyLimit} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Limite giornaliero</label>
            <input
              type="number"
              min={0}
              step={1}
              value={daily}
              onChange={(e) => {
                setDaily(e.target.value)
                setSaved(false)
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">
              Limite mensile (massimo {data.freeMonthlyCap.toLocaleString('it-IT')})
            </label>
            <input
              type="number"
              min={0}
              max={data.freeMonthlyCap}
              step={1}
              value={monthly}
              onChange={(e) => {
                setMonthly(e.target.value)
                setSaved(false)
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {saved && !error && <p className="text-sm text-emerald-600 mt-3">Impostazioni salvate.</p>}

        <div className="flex justify-end mt-4">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>

      <CountriesSettings />
    </div>
  )
}
