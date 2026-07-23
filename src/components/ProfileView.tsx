'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import Breadcrumbs from './Breadcrumbs'

const THEMES: { key: string; label: string; swatch: string }[] = [
  { key: 'blue', label: 'Blu', swatch: '#2f49b3' },
  { key: 'orange', label: 'Arancione', swatch: '#ea580c' },
  { key: 'green', label: 'Verde', swatch: '#16a34a' },
  { key: 'purple', label: 'Viola', swatch: '#7c3aed' },
  { key: 'red', label: 'Rosso', swatch: '#dc2626' },
  { key: 'teal', label: 'Azzurro', swatch: '#0d9488' },
  { key: 'pink', label: 'Rosa', swatch: '#db2777' }
]

export default function ProfileView() {
  const { update } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [themeColor, setThemeColor] = useState('blue')

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
  }, [])

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
      <Breadcrumbs items={[{ label: 'Profilo' }]} />
      <h1 className="text-xl font-bold text-slate-800 mb-6">Il tuo profilo</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
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

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
          {saved && <span className="text-sm text-emerald-600">✓ Salvato</span>}
        </div>
      </div>
    </div>
  )
}
