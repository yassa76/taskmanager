'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import type { TeamMemberDTO } from '@/types'
import DataTable, { type Column } from './DataTable'
import { EditIcon, DeleteIcon } from './icons'
import { useRoles } from '@/lib/useRoles'
import { useOrgRoles } from '@/lib/useOrgRoles'
import { scopeIn } from '@/lib/permissionsShared'

const CUSTOM_ROLE_COLOR = 'bg-teal-100 text-teal-800'
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-600 text-white',
  normal: 'bg-blue-100 text-blue-800',
  read_only: 'bg-slate-200 text-slate-600'
}

// Colori dei ruoli aziendali: toni caldi con bordo, lontani da quelli dei profili (viola, blu, grigio, verde acqua) e distinti tra loro (in ordine di creazione).
const ORG_ROLE_COLORS = [
  'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300',
  'bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-300',
  'bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-300',
  'bg-lime-100 text-lime-800 ring-1 ring-inset ring-lime-300',
  'bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-300',
  'bg-red-100 text-red-800 ring-1 ring-inset ring-red-300',
  'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300',
  'bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-300'
]

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuovo',
  invited: 'Invitato',
  active: 'Attivo',
  inactive: 'Inattivo',
  pending: 'In attesa',
  rejected: 'Rifiutato'
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-slate-200 text-slate-600',
  invited: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-red-100 text-red-700',
  pending: 'bg-violet-100 text-violet-800',
  rejected: 'bg-red-100 text-red-700'
}

export default function TeamView() {
  const { data: session } = useSession()
  const tperms = (session?.user as any)?.permissions
  const canUpdateTeam = scopeIn(tperms, 'team', 'update') !== 'none'
  const canDeleteTeam = scopeIn(tperms, 'team', 'delete') !== 'none'
  const canCreateTeam = scopeIn(tperms, 'team', 'create') !== 'none'
  const isAdmin = canUpdateTeam || canDeleteTeam

  const [members, setMembers] = useState<TeamMemberDTO[]>([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [editingMember, setEditingMember] = useState<TeamMemberDTO | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editRole, setEditRole] = useState('normal')
  const { roles, labelOf, descriptionOf } = useRoles()
  const { orgRoles } = useOrgRoles()
  const [editOrgRole, setEditOrgRole] = useState('')
  const [editStatus, setEditStatus] = useState('new')
  const [savingEdit, setSavingEdit] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'email' | 'status' | 'role' | 'orgRole'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/team')
    setMembers(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // Filtra per nome/email, poi ordina secondo la colonna scelta (default:
  // cognome, poi nome, poi email come fallback finale).
  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members
    const q = search.trim().toLowerCase()
    return members.filter(
      (m) => (m.matchedUser?.name || '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    )
  }, [members, search])

  const sortedMembers = useMemo(() => {
    const arr = [...filteredMembers]
    arr.sort((a, b) => {
      let av = ''
      let bv = ''
      switch (sortKey) {
        case 'name': {
          const lastA = (a.matchedUser?.lastName || '').toLowerCase()
          const lastB = (b.matchedUser?.lastName || '').toLowerCase()
          if (lastA !== lastB) return sortDir === 'asc' ? (lastA < lastB ? -1 : 1) : lastA < lastB ? 1 : -1
          const firstA = (a.matchedUser?.firstName || '').toLowerCase()
          const firstB = (b.matchedUser?.firstName || '').toLowerCase()
          if (firstA !== firstB) return sortDir === 'asc' ? (firstA < firstB ? -1 : 1) : firstA < firstB ? 1 : -1
          av = a.email.toLowerCase()
          bv = b.email.toLowerCase()
          break
        }
        case 'email':
          av = a.email.toLowerCase()
          bv = b.email.toLowerCase()
          break
        case 'status':
          av = a.status
          bv = b.status
          break
        case 'role':
          av = a.matchedUser?.role || 'normal'
          bv = b.matchedUser?.role || 'normal'
          break
        case 'orgRole':
          av = a.matchedUser?.orgRoleName || ''
          bv = b.matchedUser?.orgRoleName || ''
          break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filteredMembers, sortKey, sortDir])

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / PAGE_SIZE))
  const pagedMembers = sortedMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  useEffect(() => {
    setPage(1)
  }, [search])

  // Approva o rifiuta una richiesta di accesso (solo admin: lo controlla anche il server)
  async function decide(m: TeamMemberDTO, status: 'active' | 'rejected') {
    const res = await fetch(`/api/team/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      alert(body.error || `Errore (status ${res.status})`)
      return
    }
    load()
  }

  async function invite() {
    if (!firstName.trim() || !email.trim()) return
    setSaving(true)
    await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email: email.trim()
      })
    })
    setFirstName('')
    setLastName('')
    setEmail('')
    setSaving(false)
    load()
  }

  function openEdit(m: TeamMemberDTO) {
    setEditingMember(m)
    setEditFirstName(m.matchedUser?.firstName || '')
    setEditLastName(m.matchedUser?.lastName || '')
    setEditRole(m.matchedUser?.role || 'normal')
    setEditOrgRole(m.matchedUser?.orgRoleId || '')
    setEditStatus(m.status)
  }

  async function saveEdit() {
    if (!editingMember) return
    setSavingEdit(true)
    const res = await fetch(`/api/team/${editingMember.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim() || null,
        role: editRole,
        orgRoleId: editOrgRole || null,
        status: editStatus
      })
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
    if (!confirm(`Eliminare definitivamente "${m.matchedUser?.name || m.email}" dal team e dal database? Non si può annullare.`)) return
    const res = await fetch(`/api/team/${m.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      alert(body.error || `Errore nell'eliminazione (status ${res.status})`)
    }
    load()
  }

  const columns: Column<TeamMemberDTO>[] = [
    {
      id: 'name',
      exportValue: (r) => r.matchedUser?.name || '',
      label: 'Nome e cognome',
      sortKey: 'name',
      primary: true,
      render: (m) =>
        m.matchedUser ? (
          <Link
            href={`/owners/${m.matchedUser.id}`}
            className="px-2 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition"
            title="Campo condiviso con l'account personale dell'utente — clicca per vedere i suoi task"
          >
            {m.matchedUser.name || '—'}
          </Link>
        ) : (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700" title="Campo condiviso con l'account personale dell'utente">
            —
          </span>
        )
    },
    { id: 'email',
      exportValue: (r) => r.email, label: 'Email', sortKey: 'email', render: (m) => <span className="break-all">{m.email}</span> },
    {
      id: 'status',
      exportValue: (r) => STATUS_LABELS[r.status],
      label: 'Stato',
      sortKey: 'status',
      render: (m) => (
        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[m.status])}>{STATUS_LABELS[m.status]}</span>
      )
    },
    {
      id: 'role',
      exportValue: (r) => labelOf(r.matchedUser?.role || 'normal'),
      label: 'Profilo',
      sortKey: 'role',
      render: (m) => (
        <span
          title={descriptionOf(m.matchedUser?.role || 'normal')}
          className={clsx('px-2 py-1 rounded-full text-xs font-medium cursor-help', (ROLE_COLORS[m.matchedUser?.role || 'normal'] ?? CUSTOM_ROLE_COLOR))}
        >
          {labelOf(m.matchedUser?.role || 'normal')}
        </span>
      )
    },
    {
      id: 'orgRole',
      exportValue: (r) => r.matchedUser?.orgRoleName ?? '',
      label: 'Ruolo',
      sortKey: 'orgRole',
      render: (m) =>
        m.matchedUser?.orgRoleName ? (
          <span
            title={orgRoles.find((o) => o.id === m.matchedUser?.orgRoleId)?.description || undefined}
            className={clsx('px-2 py-1 rounded-full text-xs font-medium cursor-help', ORG_ROLE_COLORS[Math.max(0, orgRoles.findIndex((o) => o.id === m.matchedUser?.orgRoleId)) % ORG_ROLE_COLORS.length])}
          >
            {m.matchedUser.orgRoleName}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )
    },
    {
      id: 'actions',
      label: 'Azioni',
      fixed: true,
      align: 'right',
      tdClassName: 'whitespace-nowrap',
      render: (m) =>
        isAdmin ? (
          <>
            {canUpdateTeam && (
              <button onClick={() => openEdit(m)} className="inline-flex text-slate-400 hover:text-brand-600 mr-3 align-middle" title="Modifica">
                <EditIcon />
              </button>
            )}
            {canDeleteTeam && (
              <button onClick={() => deleteMember(m)} className="inline-flex text-slate-400 hover:text-red-600 align-middle" title="Elimina">
                <DeleteIcon />
              </button>
            )}
          </>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-slate-800">Team</h1>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ↻ Aggiorna
        </button>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        Le persone del team (quelle inattive non sono selezionabili per i task).
      </p>

      {canUpdateTeam && members.some((m) => m.status === 'pending') && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-violet-900 text-sm mb-1">Richieste di accesso in attesa</h2>
          <p className="text-xs text-violet-800 mb-3">
            Queste persone hanno provato ad accedere con il loro account Google ma non erano nel Team. Dopo l&apos;approvazione
            potranno entrare al prossimo accesso.
          </p>
          <ul className="divide-y divide-violet-100">
            {members
              .filter((m) => m.status === 'pending')
              .map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-800">{m.email}</span>
                  <span className="flex gap-2 shrink-0">
                    <button
                      onClick={() => decide(m, 'active')}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                    >
                      Approva
                    </button>
                    <button
                      onClick={() => decide(m, 'rejected')}
                      className="px-3 py-1 rounded-lg border border-red-300 text-red-700 text-xs font-medium hover:bg-red-50"
                    >
                      Rifiuta
                    </button>
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {canCreateTeam && (
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-slate-500">Nome *</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-slate-500">Cognome</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
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
          disabled={saving || !firstName.trim() || !email.trim()}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          Aggiungi al team
        </button>
      </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome o email..."
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
      </div>

      <DataTable
        tableId="team"
        exportRows={sortedMembers}
        exportName="team"
        columns={columns}
        rows={pagedMembers}
        rowKey={(m) => m.id}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(k) => toggleSort(k as typeof sortKey)}
        loading={loading}
        rowClassName={(m) => (m.status === 'inactive' ? 'opacity-50' : undefined)}
        emptyText={members.length === 0 ? 'Nessuna persona nel team ancora.' : 'Nessuna persona trovata con questa ricerca.'}
      />

      {sortedMembers.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
          <span>
            {sortedMembers.length} persone totali — pagina {page} di {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
            >
              ← Precedente
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
            >
              Successiva →
            </button>
          </div>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Modifica membro del team</h2>
            <p className="text-xs text-slate-400 mb-4">
              Nome e cognome sono gli stessi campi visibili nell&apos;account personale dell&apos;utente.
            </p>
            <div className="space-y-3">
              <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-brand-700">Nome</label>
                  <input
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-brand-700">Cognome</label>
                  <input
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Email</label>
                <input
                  value={editingMember.email}
                  disabled
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 bg-slate-50 text-slate-400"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Profilo</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                  >
                    {roles.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-500">Ruolo (gerarchia: decide chi vede cosa)</label>
                  <select
                    value={editOrgRole}
                    onChange={(e) => setEditOrgRole(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="">Nessun ruolo</option>
                    {orgRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {'— '.repeat(r.depth)}
                        {r.name}
                      </option>
                    ))}
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
                    <option value="pending">In attesa</option>
                    <option value="rejected">Rifiutato</option>
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
