'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import type { TeamMemberDTO } from '@/types'
import Breadcrumbs from './Breadcrumbs'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  normal: 'Normale',
  read_only: 'Sola lettura'
}

export default function TeamView() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [members, setMembers] = useState<TeamMemberDTO[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
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
    if (!name.trim() || !email.trim()) return
    setSaving(true)
    await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim() })
    })
    setName('')
    setEmail('')
    setSaving(false)
    load()
  }

  async function updateRole(memberId: string, role: string) {
    await fetch(`/api/team/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    })
    load()
  }

  async function toggleActive(memberId: string, active: boolean) {
    await fetch(`/api/team/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    })
    load()
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Team' }]} />
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-800">Team</h1>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ↻ Aggiorna
        </button>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        Aggiungi qui le persone del team. Sono selezionabili come owner subito, anche prima che
        facciano il login: quando si registreranno con Google usando questa email verranno
        automaticamente riconosciute.
      </p>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-slate-500">Nome *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-slate-500">Email *</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="persona@azienda.com"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <button
          onClick={invite}
          disabled={saving || !name.trim() || !email.trim()}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          Aggiungi al team
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Nome</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stato registrazione</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Ruolo</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Attivo</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  Caricamento...
                </td>
              </tr>
            )}
            {!loading &&
              members.map((m) => (
                <tr key={m.id} className={clsx('border-b border-slate-100', !m.active && 'opacity-50')}>
                  <td className="px-4 py-2">{m.matchedUser?.name || m.name || '—'}</td>
                  <td className="px-4 py-2">{m.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        m.hasLoggedIn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      )}
                    >
                      {m.hasLoggedIn ? 'Registrato' : 'Invitato, non connesso'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {isAdmin ? (
                      <select
                        value={m.matchedUser?.role || 'normal'}
                        onChange={(e) => updateRole(m.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-md px-2 py-1"
                      >
                        <option value="admin">Admin</option>
                        <option value="normal">Normale</option>
                        <option value="read_only">Sola lettura</option>
                      </select>
                    ) : (
                      <span className="text-slate-600 text-xs">
                        {ROLE_LABELS[m.matchedUser?.role || 'normal']}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isAdmin ? (
                      <button
                        onClick={() => toggleActive(m.id, !m.active)}
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          m.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        )}
                      >
                        {m.active ? 'Attivo' : 'Inattivo'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-600">{m.active ? 'Attivo' : 'Inattivo'}</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
