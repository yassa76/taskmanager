'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import type { TeamMemberDTO } from '@/types'
import Breadcrumbs from './Breadcrumbs'
import { EditIcon, DeleteIcon } from './icons'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  normal: 'Normale',
  read_only: 'Sola lettura'
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuovo',
  invited: 'Invitato',
  active: 'Attivo',
  inactive: 'Inattivo'
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-slate-200 text-slate-600',
  invited: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-red-100 text-red-700'
}

export default function TeamView() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [members, setMembers] = useState<TeamMemberDTO[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [invitingId, setInvitingId] = useState<string | null>(null)

  const [editingMember, setEditingMember] = useState<TeamMemberDTO | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('normal')
  const [editStatus, setEditStatus] = useState('new')
  const [savingEdit, setSavingEdit] = useState(false)

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

  async function sendInvite(m: TeamMemberDTO) {
    setInvitingId(m.id)
    const res = await fetch(`/api/team/${m.id}/invite`, { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(body.error || `Errore nell'invio (status ${res.status})`)
    }
    setInvitingId(null)
    load()
  }

  function openEdit(m: TeamMemberDTO) {
    setEditingMember(m)
    setEditName(m.matchedUser?.name || m.name || '')
    setEditRole(m.matchedUser?.role || 'normal')
    setEditStatus(m.status)
  }

  async function saveEdit() {
    if (!editingMember) return
    setSavingEdit(true)
    const res = await fetch(`/api/team/${editingMember.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), role: editRole, status: editStatus })
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      alert(body.error || `Errore nel salvataggio (status ${res.status})`)
    }
    setSavingEdit(false)
    setEditingMember(null)
    load()
  }

  async function deleteMember(m: TeamMemberDTO) {
    if (!confirm(`Rimuovere "${m.name || m.email}" dal team?`)) return
    const res = await fetch(`/api/team/${m.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      alert(body.error || `Errore nell'eliminazione (status ${res.status})`)
    }
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
        Aggiungi qui le persone del team. Sono selezionabili come owner subito (tranne quelle
        Inattive). Quando invii l&apos;invito passano a &quot;Invitato&quot;; quando si registrano
        con Google diventano automaticamente &quot;Attivo&quot;.
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
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stato</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Ruolo</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Azioni</th>
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
                <tr key={m.id} className={clsx('border-b border-slate-100', m.status === 'inactive' && 'opacity-50')}>
                  <td className="px-4 py-2">{m.matchedUser?.name || m.name || '—'}</td>
                  <td className="px-4 py-2">{m.email}</td>
                  <td className="px-4 py-2">
                    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[m.status])}>
                      {STATUS_LABELS[m.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-slate-600 text-xs">{ROLE_LABELS[m.matchedUser?.role || 'normal']}</span>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {isAdmin && m.status === 'new' && (
                      <button
                        onClick={() => sendInvite(m)}
                        disabled={invitingId === m.id}
                        className="text-xs text-brand-600 font-medium hover:underline mr-3 disabled:opacity-50"
                      >
                        {invitingId === m.id ? 'Invio...' : '✉ Invita'}
                      </button>
                    )}
                    {isAdmin ? (
                      <>
                        <button
                          onClick={() => openEdit(m)}
                          className="inline-flex text-slate-400 hover:text-brand-600 mr-3 align-middle"
                          title="Modifica"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => deleteMember(m)}
                          className="inline-flex text-slate-400 hover:text-red-600 align-middle"
                          title="Elimina"
                        >
                          <DeleteIcon />
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editingMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Modifica membro del team</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Nome</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Email</label>
                <input
                  value={editingMember.email}
                  disabled
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 bg-slate-50 text-slate-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Ruolo</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="admin">Admin</option>
                    <option value="normal">Normale</option>
                    <option value="read_only">Sola lettura</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Stato</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="new">Nuovo</option>
                    <option value="invited">Invitato</option>
                    <option value="active">Attivo</option>
                    <option value="inactive">Inattivo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-100"
              >
                Annulla
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {savingEdit ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
