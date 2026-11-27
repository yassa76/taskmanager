'use client'

import { CheckIcon } from './icons'
import Breadcrumbs from './Breadcrumbs'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import NotificationsView from './NotificationsView'
import { applyDensity } from './DensityApplier'

const THEMES: { key: string; label: string; swatch: string }[] = [
  { key: 'blue', label: 'Blu', swatch: '#2f49b3' },
  { key: 'orange', label: 'Arancione', swatch: '#ea580c' },
  { key: 'green', label: 'Verde', swatch: '#16a34a' },
  { key: 'purple', label: 'Viola', swatch: '#7c3aed' },
  { key: 'red', label: 'Rosso', swatch: '#dc2626' },
  { key: 'teal', label: 'Azzurro', swatch: '#0d9488' },
  { key: 'pink', label: 'Rosa', swatch: '#db2777' }
]

function PreferencesPanel() {
  const { update } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [themeColor, setThemeColor] = useState('blue')
  const [density, setDensity] = useState<'wide' | 'narrow'>('wide')

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        setFirstName(data.firstName || '')
        setLastName(data.lastName || '')
        setEmail(data.email || '')
        setThemeColor(data.themeColor || 'blue')
        setLoading(false)
      })
    fetch('/api/profile/display')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDensity(d.density === 'narrow' ? 'narrow' : 'wide'))
      .catch(() => {})
  }, [])

  // la densita' si applica e si salva subito, senza bisogno di "Salva modifiche"
  async function changeDensity(v: 'wide' | 'narrow') {
    setDensity(v)
    applyDensity(v)
    await fetch('/api/profile/display', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ density: v })
    }).catch(() => {})
  }

  useEffect(() => {
    if (loading) return
    if (themeColor === 'blue') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', themeColor)
    }
  }, [themeColor, loading])

  async function save() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), themeColor })
    })
    await update()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <p className="text-slate-400">Caricamento...</p>

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Nome</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Cognome</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">Email</label>
          <input
            value={email}
            disabled
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 bg-slate-50 text-slate-400"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 block mb-2">Colore del tema</label>
          <div className="flex flex-wrap gap-3">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setThemeColor(t.key)}
                className={clsx(
                  'flex flex-col items-center gap-1 px-2 py-2 rounded-lg border-2 transition',
                  themeColor === t.key ? 'border-slate-700' : 'border-transparent hover:border-slate-200'
                )}
                title={t.label}
              >
                <span className="w-8 h-8 rounded-full" style={{ backgroundColor: t.swatch }} />
                <span className="text-xs text-slate-500">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:block">
          <label className="text-xs font-medium text-slate-500 block mb-2">Visualizzazione</label>
          <div className="flex flex-wrap gap-3">
            {(
              [
                { k: 'wide', label: 'Estesa', hint: 'Più aria tra le righe e tra i riquadri' },
                { k: 'narrow', label: 'Compatta', hint: 'Righe, riquadri e spazi ridotti: più contenuto a schermo' }
              ] as const
            ).map((o) => (
              <button
                key={o.k}
                onClick={() => changeDensity(o.k)}
                className={clsx(
                  'text-left px-3 py-2 rounded-lg border-2 transition w-full sm:w-72 min-h-[4rem]',
                  density === o.k ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <span className="block text-sm font-medium text-slate-800">{o.label}</span>
                <span className="block text-xs text-slate-500">{o.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
          {saved && <span className="text-sm text-emerald-600"><CheckIcon /> Salvato</span>}
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4 max-w-2xl">
        Informativa: gli amministratori possono vedere quando accedi e quando usi l&apos;app, e le modifiche che fai. Questi
        dati si cancellano automaticamente dopo un periodo limitato (di default 90 giorni).
      </p>
    </div>
  )
}

const TABS = ['preferenze', 'notifiche']

export default function ProfileView() {
  const params = useSearchParams()
  const current = TABS.find((t) => t === params?.get('tab')) ?? 'preferenze'

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Il mio account' }]} />

      {current === 'preferenze' ? (
        <PreferencesPanel />
      ) : (
        <NotificationsView />
      )}
    </div>
  )
}
