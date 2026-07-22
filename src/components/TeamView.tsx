'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import type { TeamMemberDTO } from '@/types'

export default function TeamView() {
  const [members, setMembers] = useState<TeamMemberDTO[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/team')
    setMembers(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function invite() {
    if (!email) return
    setSaving(true)
    await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name })
    })
    setEmail('')
    setName('')
    setSaving(false)
    load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-1">Team</h1>
      <p className="text-slate-500 text-sm mb-6">
        Aggiungi qui le email delle persone del team. Quando faranno il login con Google usando
        una di queste email, verranno automaticamente riconosciute e associate.
      </p>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-slate-500">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="persona@azienda.com"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-slate-500">Nome (opzionale)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <button
          onClick={invite}
          disabled={saving || !email}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          Aggiungi al team
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Nome</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stato registrazione</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="text-center py-6 text-slate-400">
                  Caricamento...
                </td>
              </tr>
            )}
            {!loading &&
              members.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="px-4 py-2">{m.email}</td>
                  <td className="px-4 py-2">{m.matchedUser?.name || m.name || '—'}</td>
                  <td className="px-4 py-2">
                    <span
                      className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        m.matchedUser ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      )}
                    >
                      {m.matchedUser ? 'Registrato' : 'In attesa di registrazione'}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
