'use client'

import { useEffect, useState } from 'react'
import type { ClientDTO, TeamMemberDTO } from '@/types'

const INDUSTRIES = ['GPS', 'TMT', 'ER&I', 'FSI', 'CONS']

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

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ClientFormState>(emptyForm)

  const [newProjectName, setNewProjectName] = useState<Record<string, string>>({})
  const [savingProject, setSavingProject] = useState<string | null>(null)

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
        ? `Eliminare "${c.name}"? Verranno eliminati anche i suoi ${c.projects.length} progetti collegati. I task esistenti non verranno cancellati ma perderanno il riferimento a questo cliente/progetto.`
        : `Eliminare il cliente "${c.name}"?`
    if (!confirm(confirmMsg)) return
    await fetch(`/api/clients/${c.id}`, { method: 'DELETE' })
    load()
  }

  async function addProject(clientId: string) {
    const name = (newProjectName[clientId] || '').trim()
    if (!name) return
    setSavingProject(clientId)
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, clientId })
    })
    setNewProjectName((p) => ({ ...p, [clientId]: '' }))
    setSavingProject(null)
    load()
  }

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

      {loading && <p className="text-slate-400">Caricamento...</p>}

      <div className="space-y-3">
        {!loading &&
          clients.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-slate-800">{c.name}</h2>
                    {c.industry && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                        {c.industry}
                      </span>
                    )}
                  </div>
                  {c.description && <p className="text-sm text-slate-500 mt-1">{c.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    Owner: {c.owner ? c.owner.name || c.owner.email : '—'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEditForm(c)}
                    className="text-xs text-brand-600 font-medium hover:underline"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => deleteClient(c)}
                    className="text-xs text-red-500 font-medium hover:underline"
                  >
                    Elimina
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100">
                {c.projects.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {c.projects.map((p) => (
                      <li key={p.id} className="text-sm text-slate-600 pl-3 border-l-2 border-slate-200">
                        {p.name}
                      </li>
                    ))}
                  </ul>
                )}
                {c.projects.length === 0 && (
                  <p className="text-sm text-slate-400 mb-2">Nessun progetto/opportunità ancora.</p>
                )}
                <div className="flex gap-2">
                  <input
                    value={newProjectName[c.id] || ''}
                    onChange={(e) => setNewProjectName((p) => ({ ...p, [c.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addProject(c.id)}
                    placeholder="Nome progetto/opportunità"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => addProject(c.id)}
                    disabled={savingProject === c.id || !(newProjectName[c.id] || '').trim()}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                  >
                    + Aggiungi progetto
                  </button>
                </div>
              </div>
            </div>
          ))}
        {!loading && clients.length === 0 && (
          <p className="text-slate-400 text-sm">Nessun cliente ancora. Aggiungine uno con il pulsante sopra.</p>
        )}
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
