'use client'

import { useState } from 'react'
import type { ClientDTO, TaskDTO } from '@/types'

interface OwnerLite {
  id: string
  name: string
  email: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function TaskFormModal({
  owners,
  clients: initialClients,
  task,
  onClose,
  onSaved
}: {
  owners: OwnerLite[]
  clients: ClientDTO[]
  task?: TaskDTO
  onClose: () => void
  onSaved: () => void
}) {
  const isEditing = !!task
  const [clients, setClients] = useState<ClientDTO[]>(initialClients)
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [startDate, setStartDate] = useState(task?.startDate ? task.startDate.slice(0, 10) : today())
  const [endDate, setEndDate] = useState(task?.endDate ? task.endDate.slice(0, 10) : '')
  const [ownerId, setOwnerId] = useState(task?.owner?.id || owners[0]?.id || '')
  const [clientId, setClientId] = useState(task?.clientId || '')
  const [subtasks, setSubtasks] = useState<{ title: string; ownerId: string; endDate: string }[]>([])
  const [saving, setSaving] = useState(false)

  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [savingClient, setSavingClient] = useState(false)

  const subtasksValid = subtasks.every((s) => s.title.trim().length === 0 || !!s.endDate)
  const isValid =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !!startDate &&
    !!endDate &&
    !!ownerId &&
    subtasksValid

  async function createClient() {
    if (!newClientName.trim()) return
    setSavingClient(true)
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientName.trim() })
    })
    const created = await res.json()
    const newClient: ClientDTO = {
      id: created.id,
      name: created.name,
      description: created.description ?? null,
      industry: created.industry ?? null,
      owner: created.owner ?? null,
      projects: []
    }
    setClients((prev) => [...prev, newClient])
    setClientId(created.id)
    setNewClientName('')
    setShowNewClient(false)
    setSavingClient(false)
  }

  function addSubtask() {
    setSubtasks((s) => [...s, { title: '', ownerId, endDate: '' }])
  }

  function updateSubtask(i: number, field: 'title' | 'ownerId' | 'endDate', value: string) {
    setSubtasks((s) => s.map((st, idx) => (idx === i ? { ...st, [field]: value } : st)))
  }

  function removeSubtask(i: number) {
    setSubtasks((s) => s.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (!isValid) return
    setSaving(true)

    const payload = {
      title: title.trim(),
      description: description.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      ownerId,
      clientId: clientId || null,
      ...(isEditing
        ? {}
        : {
            subtasks: subtasks
              .filter((s) => s.title.trim().length > 0)
              .map((s) => ({ title: s.title, ownerId: s.ownerId, endDate: s.endDate }))
          })
    }

    if (isEditing) {
      await fetch(`/api/tasks/${task!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } else {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          {isEditing ? 'Modifica task' : 'Nuovo task'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Nome task *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Descrizione task *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Data avvio *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Data di scadenza *</label>
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
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-500">Cliente (opzionale)</label>
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
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
              >
                <option value="">— Nessun cliente —</option>
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

          {!isEditing && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-500">Sub-task</label>
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
                    <input
                      type="date"
                      value={s.endDate}
                      onChange={(e) => updateSubtask(i, 'endDate', e.target.value)}
                      title="Data di scadenza (obbligatoria)"
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                    />
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
                    Nessun sub-task aggiunto. Potrai aggiungerne in seguito dalla pagina di dettaglio del task.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-100">
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={saving || !isValid}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : isEditing ? 'Salva modifiche' : 'Crea task'}
          </button>
        </div>
      </div>
    </div>
  )
}
