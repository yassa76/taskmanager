'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/taskStatus'
import type { SubtaskDetailDTO, TeamMemberDTO } from '@/types'
import Breadcrumbs from './Breadcrumbs'
import { EditIcon, DeleteIcon } from './icons'

export default function SubtaskDetailView({ subtaskId }: { subtaskId: string }) {
  const router = useRouter()
  const [subtask, setSubtask] = useState<SubtaskDetailDTO | null>(null)
  const [team, setTeam] = useState<TeamMemberDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [showEditForm, setShowEditForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('da_avviare')
  const [ownerId, setOwnerId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [closedAt, setClosedAt] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [subtaskRes, teamRes] = await Promise.all([
        fetch(`/api/subtasks/${subtaskId}`),
        fetch('/api/team')
      ])
      if (!subtaskRes.ok) {
        const body = await subtaskRes.json().catch(() => ({}))
        setError(body.error || `Errore nel caricare il sub-task (status ${subtaskRes.status})`)
        return
      }
      const data: SubtaskDetailDTO = await subtaskRes.json()
      setSubtask(data)
      setTitle(data.title)
      setDescription(data.description || '')
      setStatus(data.status)
      setOwnerId(data.owner.id)
      setStartDate(data.startDate.slice(0, 10))
      setEndDate(data.endDate ? data.endDate.slice(0, 10) : '')
      setClosedAt(data.closedAt ? data.closedAt.slice(0, 10) : '')
      setTeam(teamRes.ok ? await teamRes.json() : [])
    } catch (e: any) {
      setError(`Errore imprevisto: ${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }, [subtaskId])

  useEffect(() => {
    load()
  }, [load])

  const owners = team
    .filter((t) => t.status !== 'inactive' && t.matchedUser)
    .map((t) => ({ id: t.matchedUser!.id, name: t.matchedUser!.name || t.email, email: t.email }))

  function openEdit() {
    if (!subtask) return
    setTitle(subtask.title)
    setDescription(subtask.description || '')
    setStatus(subtask.status)
    setOwnerId(subtask.owner.id)
    setStartDate(subtask.startDate.slice(0, 10))
    setEndDate(subtask.endDate ? subtask.endDate.slice(0, 10) : '')
    setClosedAt(subtask.closedAt ? subtask.closedAt.slice(0, 10) : '')
    setShowEditForm(true)
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        status,
        ownerId,
        startDate: startDate || null,
        endDate: endDate || null,
        closedAt: closedAt || null
      })
    })
    setSaving(false)
    setShowEditForm(false)
    load()
  }

  async function closeNow() {
    const today = new Date().toISOString().slice(0, 10)
    setSaving(true)
    await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completato', closedAt: today })
    })
    setSaving(false)
    load()
  }

  async function deleteSubtask() {
    if (!subtask) return
    if (!confirm(`Eliminare il sub-task "${subtask.title}"?`)) return
    await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' })
    router.push(`/tasks/${subtask.taskId}`)
  }

  if (loading) return <p className="text-slate-400">Caricamento...</p>
  if (error) return <p className="text-red-500">{error}</p>
  if (!subtask) return <p className="text-slate-400">Sub-task non trovato.</p>

  const isOverdue =
    subtask.endDate && new Date(subtask.endDate) < new Date() && subtask.status !== 'completato' && subtask.status !== 'annullato'

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Task', href: '/tasks' },
          ...(subtask.task.clientId
            ? [{ label: subtask.task.clientName || 'Cliente', href: `/clients/${subtask.task.clientId}` }]
            : []),
          { label: subtask.task.title, href: `/tasks/${subtask.taskId}` },
          { label: subtask.title }
        ]}
      />

      <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-2xl">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">{subtask.title}</h1>
            <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[subtask.status])}>
              {STATUS_LABELS[subtask.status]}
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={openEdit}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
              title="Modifica"
            >
              <EditIcon />
            </button>
            <button
              onClick={deleteSubtask}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              title="Elimina"
            >
              <DeleteIcon />
            </button>
          </div>
        </div>

        {subtask.description && <p className="text-slate-500 text-sm mb-4">{subtask.description}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-sm">
          <div>
            <p className="text-xs text-slate-400 uppercase">Owner</p>
            <p className="text-slate-700">{subtask.owner.name || subtask.owner.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">Data inizio</p>
            <p className="text-slate-700">{subtask.startDate.slice(0, 10)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">Data di scadenza</p>
            <p className={clsx(isOverdue ? 'text-red-600 font-semibold' : 'text-slate-700')}>
              {subtask.endDate ? subtask.endDate.slice(0, 10) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">Data di chiusura</p>
            <p className="text-slate-700">{subtask.closedAt ? subtask.closedAt.slice(0, 10) : '—'}</p>
          </div>
        </div>

        {subtask.status !== 'completato' && subtask.status !== 'annullato' && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button onClick={closeNow} className="text-sm text-emerald-700 font-medium hover:underline">
              ✓ Chiudi oggi
            </button>
          </div>
        )}
      </div>

      {showEditForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Modifica sub-task</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Nome</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Dettagli / note</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Aggiungi dettagli, note, contesto..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Owner</label>
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
                  <label className="text-xs font-medium text-slate-500">Stato</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="da_avviare">Da avviare</option>
                    <option value="in_corso">In corso</option>
                    <option value="completato">Completato</option>
                    <option value="annullato">Annullato</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Data inizio</label>
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
                    className={clsx(
                      'w-full border rounded-lg px-3 py-2 mt-1',
                      endDate && new Date(endDate) < new Date() && status !== 'completato' && status !== 'annullato'
                        ? 'border-red-300 text-red-600 font-semibold'
                        : 'border-slate-200'
                    )}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Data di chiusura</label>
                  <input
                    type="date"
                    value={closedAt}
                    onChange={(e) => setClosedAt(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                  />
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
                onClick={save}
                disabled={saving || !title.trim() || !endDate}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
