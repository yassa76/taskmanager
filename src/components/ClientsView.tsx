'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { ClientDTO, TeamMemberDTO } from '@/types'

const INDUSTRIES = ['GPS', 'TMT', 'ER&I', 'FSI', 'CONS']

type SortKey = 'name' | 'industry' | 'owner'
type SortDir = 'asc' | 'desc'

interface OwnerLite {
  id: string
  name: string
  email: string
}

interface ClientFormState {
  name: string
  description: string
  industry: string
  ownerId: string
}

const emptyForm: ClientFormState = { name: '', description: '', industry: '', ownerId: '' }

export default function ClientsView() {
  const [clients, setClients] = useState<ClientDTO[]>([])
  const [owners, setOwners] = useState<OwnerLite[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ClientFormState>(emptyForm)

  async function load() {
    setLoading(true)
    const [clientsRes, teamRes] = await Promise.all([fetch('/api/clients'), fetch('/api/team')])
    setClients(await clientsRes.json())
    const team: TeamMemberDTO[] = await teamRes.json()
    setOwners(
      team
        .filter((t) => t.matchedUser)
        .map((t) => ({ id: t.matchedUser!.id, name: t.matchedUser!.name || t.email, email: t.email }))
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const sortedClients = useMemo(() => {
    const arr = [...clients]
    arr.sort((a, b) => {
      let av = ''
      let bv = ''
      switch (sortKey) {
        case 'name':
          av = a.name.toLowerCase()
          bv = b.name.toLowerCase()
          break
        case 'industry':
          av = (a.industry || '').toLowerCase()
          bv = (b.industry || '').toLowerCase()
          break
        case 'owner':
          av = (a.owner?.name || a.owner?.email || '').toLowerCase()
          bv = (b.owner?.name || b.owner?.email || '').toLowerCase()
          break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [clients, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function openNewForm() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEditForm(c: ClientDTO) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      description: c.description || '',
      industry: c.industry || '',
      ownerId: c.owner?.id || ''
    })
    setShowForm(true)
  }

  async function saveClient() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      industry: form.industry || null,
      ownerId: form.ownerId || null
    }
    if (editingId) {
      await fetch(`/api/clients/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } else {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
    setEditingId(null)
    load()
  }

  async function deleteClient(c: ClientDTO) {
    const confirmMsg =
      c.projects.length > 0
        ? `Eliminare "${c.name}"? Verranno eliminati anche i suoi ${c.projects.length} progetti collegati. I task esistenti non verranno cancellati ma perderanno il riferimento a questo cliente.`
        : `Eliminare il cliente "${c.name}"?`
    if (!confirm(confirmMsg)) return
    await fetch(`/api/clients/${c.id}`, { method: 'DELETE' })
    load()
  }

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      onClick={() => toggleSort(k)}
      className="cursor-pointer px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-brand-600"
    >
      {label} {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </th>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Clienti</h1>
        <button
          onClick={openNewForm}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          + Nuovo cliente
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <SortHeader label="Nome" k="name" />
              <SortHeader label="Industry" k="industry" />
              <SortHeader label="Owner" k="owner" />
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-slate-400">
                  Caricamento...
                </td>
              </tr>
            )}
            {!loading &&
              sortedClients.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/clients/${c.id}`} className="text-brand-600 font-semibold hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    {c.industry && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                        {c.industry}
                      </span>
                    )}
                    {!c.industry && <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2">{c.owner ? c.owner.name || c.owner.email : '—'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEditForm(c)}
                      className="text-xs text-brand-600 font-medium hover:underline mr-3"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => deleteClient(c)}
                      className="text-xs text-red-500 font-medium hover:underline"
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && sortedClients.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-slate-400">
                  Nessun cliente ancora. Aggiungine uno con il pulsante sopra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {editingId ? 'Modifica cliente' : 'Nuovo cliente'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Nome *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Descrizione</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Industry</label>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="">—</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Owner</label>
                  <select
                    value={form.ownerId}
                    onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="">—</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowForm(false)
                  setForm(emptyForm)
                  setEditingId(null)
                }}
                className="px-4 py-2 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-100"
              >
                Annulla
              </button>
              <button
                onClick={saveClient}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Crea cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
