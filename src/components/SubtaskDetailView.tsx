'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/taskStatus'
import type { SubtaskDetailDTO, TeamMemberDTO } from '@/types'
import Breadcrumbs from './Breadcrumbs'
import { DeleteIcon } from './icons'

export default function SubtaskDetailView({ subtaskId }: { subtaskId: string }) {
  const router = useRouter()
  const [subtask, setSubtask] = useState<SubtaskDetailDTO | null>(null)
  const [team, setTeam] = useState<TeamMemberDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    .filter((t) => t.active && t.matchedUser)
    .map((t) => ({ id: t.matchedUser!.id, name: t.matchedUser!.name || t.email, email: t.email }))

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
    load()
  }

  // "Chiudi oggi" imposta SOLO la data di chiusura effettiva (closedAt) e lo
  // stato: non tocca la data di scadenza (endDate), che resta il termine
  // originariamente previsto.
  async function closeNow() {
    const today = new Date().toISOString().slice(0, 10)
    setClosedAt(today)
    setStatus('completato')
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
            <h1 className="text-xl font-bold text-slate-800">Sub-task</h1>
            <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[status as keyof typeof STATUS_COLORS])}>
              {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
            </span>
          </div>
          <button
            onClick={deleteSubtask}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            title="Elimina"
          >
            <DeleteIcon />
          </button>
        </div>

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
                  endDate && new Date(endDate) < new Date() && status !== 'completato'
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

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={closeNow}
            className="text-sm text-emerald-700 font-medium hover:underline"
          >
            ✓ Chiudi oggi
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
  )
}
