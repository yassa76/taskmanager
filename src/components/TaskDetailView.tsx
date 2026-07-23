'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/taskStatus'
import type { TaskDTO, TeamMemberDTO, ClientDTO } from '@/types'
import TaskFormModal from './TaskFormModal'
import CloseParentModal from './CloseParentModal'
import Breadcrumbs from './Breadcrumbs'
import { EditIcon, DeleteIcon } from './icons'

export default function TaskDetailView({ taskId }: { taskId: string }) {
  const router = useRouter()
  const [task, setTask] = useState<TaskDTO | null>(null)
  const [team, setTeam] = useState<TeamMemberDTO[]>([])
  const [clients, setClients] = useState<ClientDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskOwnerId, setNewSubtaskOwnerId] = useState('')
  const [newSubtaskEndDate, setNewSubtaskEndDate] = useState('')
  const [savingSubtask, setSavingSubtask] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [taskRes, teamRes, clientsRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`),
        fetch('/api/team'),
        fetch('/api/clients')
      ])
      if (!taskRes.ok) {
        const body = await taskRes.json().catch(() => ({}))
        setError(body.error || `Errore nel caricare il task (status ${taskRes.status})`)
        return
      }
      const data = await taskRes.json()
      setTask(data)
      setNewSubtaskOwnerId((prev) => prev || data.owner?.id || '')
      setTeam(teamRes.ok ? await teamRes.json() : [])
      setClients(clientsRes.ok ? await clientsRes.json() : [])
    } catch (e: any) {
      setError(`Errore imprevisto: ${e?.message || e}`)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  useEffect(() => {
    load()
  }, [load])

  const owners = team
    .filter((t) => t.status !== 'inactive' && t.matchedUser)
    .map((t) => ({ id: t.matchedUser!.id, name: t.matchedUser!.name || t.email, email: t.email }))

  async function updateSubtaskStatus(subtaskId: string, status: string) {
    const res = await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    const data = await res.json()
    await load()
    if (data.pendingClosure) setPendingClose(true)
  }

  async function updateSubtaskOwner(subtaskId: string, ownerId: string) {
    await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId })
    })
    load()
  }

  async function updateSubtaskDate(subtaskId: string, field: 'startDate' | 'endDate', value: string) {
    await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value || null })
    })
    load()
  }

  async function deleteSubtask(subtaskId: string) {
    if (!confirm('Eliminare questo sub-task?')) return
    await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' })
    load()
  }

  async function addSubtask() {
    if (!newSubtaskTitle.trim() || !newSubtaskEndDate || !task) return
    setSavingSubtask(true)
    await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newSubtaskTitle.trim(),
        ownerId: newSubtaskOwnerId,
        endDate: newSubtaskEndDate
      })
    })
    setNewSubtaskTitle('')
    setNewSubtaskEndDate('')
    setSavingSubtask(false)
    load()
  }

  async function deleteTask() {
    if (!task) return
    if (!confirm(`Eliminare il task "${task.title}" e tutti i suoi sub-task?`)) return
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    router.push('/tasks')
  }

  async function confirmCloseParent(confirmValue: boolean) {
    if (!task) return
    await fetch(`/api/tasks/${task.id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: confirmValue })
    })
    setPendingClose(false)
    load()
  }

  if (loading) return <p className="text-slate-400">Caricamento...</p>
  if (error) return <p className="text-red-500">{error}</p>
  if (!task) return <p className="text-slate-400">Task non trovato.</p>

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Task', href: '/tasks' },
          ...(task.clientId ? [{ label: task.clientName || 'Cliente', href: `/clients/${task.clientId}` }] : []),
          { label: task.title }
        ]}
      />

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">{task.title}</h1>
              <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[task.status])}>
                {STATUS_LABELS[task.status]}
              </span>
            </div>
            {task.description && <p className="text-slate-500 text-sm mt-2">{task.description}</p>}
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
            <button
              onClick={deleteTask}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              title="Elimina"
            >
              <DeleteIcon />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 text-sm">
          <div>
            <p className="text-xs text-slate-400 uppercase">Cliente</p>
            {task.clientId ? (
              <Link href={`/clients/${task.clientId}`} className="text-brand-600 font-medium hover:underline">
                {task.clientName}
              </Link>
            ) : (
              <p className="text-slate-700">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">Owner</p>
            <p className="text-slate-700">{task.owner.name || task.owner.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">Data avvio</p>
            <p className="text-slate-700">{task.startDate ? task.startDate.slice(0, 10) : '—'}</p>
          </div>
         <div>
            <p className="text-xs text-slate-400 uppercase">Data di scadenza</p>
            <p
              className={clsx(
                task.endDate && new Date(task.endDate) < new Date() && task.status !== 'completato'
                  ? 'text-red-600 font-semibold'
                  : 'text-slate-700'
              )}
            >
              {task.endDate ? task.endDate.slice(0, 10) : '—'}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${task.progress}%` }} />
          </div>
          <span className="text-xs text-slate-400">{task.progress}% completato</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Sub-task</h2>
          <button
            onClick={load}
            className="text-xs text-slate-500 font-medium hover:text-brand-600"
          >
            ↻ Aggiorna
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Nome</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Owner</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Data inizio</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Data scadenza</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stato</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {task.subtasks.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 max-w-xs">
                  <Link
                    href={`/subtasks/${s.id}`}
                    className="block truncate text-brand-600 font-medium hover:underline"
                    title={s.title}
                  >
                    {s.title}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={s.owner.id}
                    onChange={(e) => updateSubtaskOwner(s.id, e.target.value)}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1"
                  >
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={s.startDate ? s.startDate.slice(0, 10) : ''}
                    onChange={(e) => updateSubtaskDate(s.id, 'startDate', e.target.value)}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1"
                  />
                </td>
               <td className="px-4 py-2">
                  <input
                    type="date"
                    value={s.endDate ? s.endDate.slice(0, 10) : ''}
                    onChange={(e) => updateSubtaskDate(s.id, 'endDate', e.target.value)}
                    className={clsx(
                      'text-xs border rounded-md px-2 py-1',
                      s.endDate && new Date(s.endDate) < new Date() && s.status !== 'completato'
                        ? 'border-red-300 text-red-600 font-semibold'
                        : 'border-slate-200'
                    )}
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={s.status}
                    onChange={(e) => updateSubtaskStatus(s.id, e.target.value)}
                    className={clsx('text-xs rounded-md px-2 py-1 border-0 font-medium', STATUS_COLORS[s.status])}
                  >
                    <option value="da_avviare">Da avviare</option>
                    <option value="in_corso">In corso</option>
                    <option value="completato">Completato</option>
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => deleteSubtask(s.id)}
                    className="inline-flex text-slate-400 hover:text-red-600 align-middle"
                    title="Elimina"
                  >
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}
            {task.subtasks.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  Nessun sub-task ancora.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex gap-2 p-4 border-t border-slate-100 flex-wrap">
          <input
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            placeholder="Nuovo sub-task"
            className="flex-1 min-w-[160px] border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          />
          <select
            value={newSubtaskOwnerId}
            onChange={(e) => setNewSubtaskOwnerId(e.target.value)}
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
            value={newSubtaskEndDate}
            onChange={(e) => setNewSubtaskEndDate(e.target.value)}
            title="Data di scadenza (obbligatoria)"
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
          />
          <button
            onClick={addSubtask}
            disabled={savingSubtask || !newSubtaskTitle.trim() || !newSubtaskEndDate}
            className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            + Aggiungi
          </button>
        </div>
      </div>

      {showEditForm && (
        <TaskFormModal
          owners={owners}
          clients={clients}
          task={task}
          onClose={() => setShowEditForm(false)}
          onSaved={() => {
            setShowEditForm(false)
            load()
          }}
        />
      )}

      {pendingClose && (
        <CloseParentModal
          task={task}
          onConfirm={(confirm) => confirmCloseParent(confirm)}
          onDismiss={() => setPendingClose(false)}
        />
      )}
    </div>
  )
}
