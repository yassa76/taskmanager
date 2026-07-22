'use client'

import { useEffect, useState } from 'react'
import type { ClientDTO } from '@/types'

export default function ClientsView() {
  const [clients, setClients] = useState<ClientDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [newClientName, setNewClientName] = useState('')
  const [savingClient, setSavingClient] = useState(false)
  const [newProjectName, setNewProjectName] = useState<Record<string, string>>({})
  const [savingProject, setSavingProject] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/clients')
    setClients(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addClient() {
    if (!newClientName.trim()) return
    setSavingClient(true)
    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientName.trim() })
    })
    setNewClientName('')
    setSavingClient(false)
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
      <h1 className="text-xl font-bold text-slate-800 mb-1">Clienti & Progetti</h1>
      <p className="text-slate-500 text-sm mb-6">
        Gestisci l&apos;anagrafica clienti e i relativi progetti/opportunità. Questi valori
        compariranno nel menu a tendina quando crei un nuovo task.
      </p>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500">Nuovo cliente</label>
          <input
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addClient()}
            placeholder="Nome cliente"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
          />
        </div>
        <button
          onClick={addClient}
          disabled={savingClient || !newClientName.trim()}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          Aggiungi cliente
        </button>
      </div>

      {loading && <p className="text-slate-400">Caricamento...</p>}

      <div className="space-y-3">
        {!loading &&
          clients.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <h2 className="font-semibold text-slate-800 mb-2">{c.name}</h2>

              {c.projects.length > 0 && (
                <ul className="mb-3 space-y-1">
                  {c.projects.map((p) => (
                    <li key={p.id} className="text-sm text-slate-600 pl-3 border-l-2 border-slate-200">
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}
              {c.projects.length === 0 && (
                <p className="text-sm text-slate-400 mb-3">Nessun progetto/opportunità ancora.</p>
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
          ))}
        {!loading && clients.length === 0 && (
          <p className="text-slate-400 text-sm">Nessun cliente ancora. Aggiungine uno sopra.</p>
        )}
      </div>
    </div>
  )
}
