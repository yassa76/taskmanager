'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import type { ClientDTO, TaskDTO, TeamMemberDTO } from '@/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/taskStatus'
import Breadcrumbs from './Breadcrumbs'
import { EditIcon, DeleteIcon } from './icons'
import TaskFormModal from './TaskFormModal'

const INDUSTRIES = ['GPS', 'TMT', 'ER&I', 'FSI', 'CONS']

interface OwnerLite {
  id: string
  name: string
  email: string
}

export default function ClientDetailView({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<ClientDTO | null>(null)
  const [tasks, setTasks] = useState<TaskDTO[]>([])
  const [allClients, setAllClients] = useState<ClientDTO[]>([])
  const [owners, setOwners] = useState<OwnerLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showEditForm, setShowEditForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', industry: '', ownerId: '' })

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [clientRes, tasksRes, teamRes, clientsRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/tasks?clientId=${clientId}`),
        fetch('/api/team'),
        fetch('/api/clients')
      ])
      if (!clientRes.ok) {
        setError(`Errore nel caricare il cliente (status ${clientRes.status})`)
        return
      }
      const clientData: ClientDTO = await clientRes.json()
      setClient(clientData)
      setForm({
        name: clientData.name,
        description: clientData.description || '',
        industry: clientData.industry || '',
        ownerId: clientData.owner?.id || ''
      })
      setTasks(tasksRes.ok ? await tasksRes.json() : [])
      setAllClients(clientsRes.ok ? await clientsRes.json() : [])
      if (teamRes.ok) {
        const team: TeamMemberDTO[] = await teamRes.json()
        setOwners(
          team
            .filter((t) => t.active && t.matchedUser)
            .map((t) => ({ id: t.matchedUser!.id, name: t.matchedUser!.name || t.email, email: t.email }))
        )
      }
    } catch (e: any) {
      setError(`Errore imprevisto: ${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  async function saveClient() {
    if (!form.name.trim()) return
    setSaving(true)
    await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || null,
        industry: form.industry || null,
        ownerId: form.ownerId || null
      })
    })
    setSaving(false)
    setShowEditForm(false)
    load()
  }

  async function deleteTask(t: TaskDTO) {
    if (!confirm(`Eliminare il task "${t.title}" e tutti i suoi sub-task?`)) return
    await fetch(`/api/tasks/${t.id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <p className="text-slate-400">Caricamento...</p>
  if (error) return <p className="text-red-500">{error}</p>
  if (!client) return <p className="text-slate-400">Cliente non trovato.</p>

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Clienti', href: '/clients' },
          { label: client.name }
        ]}
      />

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-bold text-slate-800">{client.name}</h1>
            {client.industry && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                {client.industry}
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={load}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              ↻ Aggiorna
            </button>
            <button
              onClick={() => setShowEditForm(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
              title="Modifica"
            >
              <EditIcon />
            </button>
          </div>
        </div>
        {client.description && <p className="text-slate-500 text-sm mt-2">{client.description}</p>}
        <p className="text-xs text-slate-400 mt-2">
          Owner: {client.owner ? client.owner.name || client.owner.email : '—'}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Task associati</h2>
          <button
            onClick={() => {
              setEditingTask(null)
              setShowTaskForm(true)
            }}
            className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            + Nuovo Task
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Task</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Owner</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Scadenza</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stato</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 max-w-xs">
                  <Link
                    href={`/tasks/${t.id}`}
                    className="block truncate text-brand-600 font-semibold hover:underline"
                    title={t.title}
                  >
                    {t.title}
                  </Link>
                </td>
                <td className="px-4 py-2">{t.owner.name || t.owner.email}</td>
                <td className="px-4 py-2">{t.endDate ? t.endDate.slice(0, 10) : '—'}</td>
                <td className="px-4 py-2">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[t.status])}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button
                    onClick={() => {
                      setEditingTask(t)
                      setShowTaskForm(true)
                    }}
                    className="inline-flex text-slate-400 hover:text-brand-600 mr-3 align-middle"
                    title="Modifica"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => deleteTask(t)}
                    className="inline-flex text-slate-400 hover:text-red-600 align-middle"
                    title="Elimina"
                  >
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  Nessun task associato a questo cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showEditForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Modifica cliente</h2>
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
                onClick={() => setShowEditForm(false)}
                className="px-4 py-2 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-100"
              >
                Annulla
              </button>
              <button
                onClick={saveClient}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskForm && (
        <TaskFormModal
          owners={owners}
          clients={allClients}
          task={editingTask || undefined}
          defaultClientId={client.id}
          onClose={() => {
            setShowTaskForm(false)
            setEditingTask(null)
          }}
          onSaved={() => {
            setShowTaskForm(false)
            setEditingTask(null)
            load()
          }}
        />
      )}
    </div>
  )
}
