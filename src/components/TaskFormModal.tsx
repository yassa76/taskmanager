'use client'

import { useState } from 'react'
import type { ClientDTO } from '@/types'

interface OwnerLite {
  id: string
  name: string
  email: string
}

export default function TaskFormModal({
  owners,
  clients: initialClients,
  onClose,
  onCreated
}: {
  owners: OwnerLite[]
  clients: ClientDTO[]
  onClose: () => void
  onCreated: () => void
}) {
  const [clients, setClients] = useState<ClientDTO[]>(initialClients)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [ownerId, setOwnerId] = useState(owners[0]?.id || '')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [subtasks, setSubtasks] = useState<{ title: string; ownerId: string }[]>([])
  const [saving, setSaving] = useState(false)

  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [savingClient, setSavingClient] = useState(false)

  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [savingProject, setSavingProject] = useState(false)

  const selectedClient = clients.find((c) => c.id === clientId)

  async function createClient() {
    if (!newClientName.trim()) return
    setSavingClient(true)
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientName.trim() })
    })
    const created = await res.json()
    const newClient: ClientDTO = { id: created.id, name: created.name, projects: [] }
    setClients((prev) => [...prev, newClient])
    setClientId(created.id)
    setNewClientName('')
    setShowNewClient(false)
    setSavingClient(false)
  }

  async function createProject() {
    if (!newProjectName.trim() || !clientId) return
    setSavingProject(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProjectName.trim(), clientId })
    })
    const created = await res.json()
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId ? { ...c, projects: [...c.projects, { id: created.id, name: created.name }] } : c
      )
    )
    setProjectId(created.id)
    setNewProjectName('')
    setShowNewProject(false)
    setSavingProject(false)
  }

  function addSubtask() {
    setSubtasks((s) => [...s, { title: '', ownerId }])
  }

  function updateSubtask(i: number, field: 'title' | 'ownerId', value: string) {
    setSubtasks((s) => s.map((st, idx) => (idx === i ? { ...st, [field]: value } : st)))
  }

  function removeSubtask(i: number) {
    setSubtasks((s) => s.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (!title || !ownerId) return
    setSaving(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        startDate: startDate || null,
        endDate: endDate || null,
        ownerId,
        projectId: projectId || null,
        subtasks: subtasks.filter((s) => s.title.trim().length > 0)
      })
    })
    setSaving(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Nuovo task</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Titolo *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Descrizione</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Data avvio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Data fine</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Owner *</label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            >
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">Cliente</label>
                <button
                  type="button"
                  onClick={() => setShowNewClient((v) => !v)}
                  className="text-xs text-brand-600 font-medium hover:underline"
                >
                  {showNewClient ? 'Annulla' : '+ Nuovo cliente'}
                </button>
              </div>
              {!showNewClient && (
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value)
                    setProjectId('')
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                >
                  <option value="">—</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {showNewClient && (
                <div className="flex gap-2 mt-1">
                  <input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Nome nuovo cliente"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={createClient}
                    disabled={savingClient || !newClientName.trim()}
                    className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    Salva
                  </button>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">Progetto/Opportunità</label>
                {clientId && (
                  <button
                    type="button"
                    onClick={() => setShowNewProject((v) => !v)}
                    className="text-xs text-brand-600 font-medium hover:underline"
                  >
                    {showNewProject ? 'Annulla' : '+ Nuovo progetto'}
                  </button>
                )}
              </div>
              {!showNewProject && (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                  disabled={!selectedClient}
                >
                  <option value="">—</option>
                  {selectedClient?.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              {showNewProject && (
                <div className="flex gap-2 mt-1">
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Nome nuovo progetto"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={createProject}
                    disabled={savingProject || !newProjectName.trim()}
                    className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    Salva
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-500">Sotto-task</label>
              <button
                type="button"
                onClick={addSubtask}
                className="text-xs text-brand-600 font-medium hover:underline"
              >
                + Aggiungi
              </button>
            </div>
            <div className="space-y-2">
              {subtasks.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={s.title}
                    onChange={(e) => updateSubtask(i, 'title', e.target.value)}
                    placeholder="Descrizione attività"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <select
                    value={s.ownerId}
                    onChange={(e) => updateSubtask(i, 'ownerId', e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                  >
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeSubtask(i)}
                    className="text-slate-400 hover:text-red-600 px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {subtasks.length === 0 && (
                <p className="text-xs text-slate-400">
                  Nessun sotto-task aggiunto (l&apos;owner di default sarà quello del task padre).
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-100">
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={saving || !title || !ownerId}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Crea task'}
          </button>
        </div>
      </div>
    </div>
  )
}
