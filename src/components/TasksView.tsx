'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import clsx from 'clsx'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/taskStatus'
import type { TaskDTO, TeamMemberDTO, ClientDTO } from '@/types'
import TaskFormModal from './TaskFormModal'
import Filters, { FilterState } from './Filters'
import Breadcrumbs from './Breadcrumbs'

type SortKey = 'title' | 'clientName' | 'owner' | 'startDate' | 'endDate' | 'status'
type SortDir = 'asc' | 'desc'

const defaultFilters: FilterState = {
  view: 'all',
  clientId: '',
  ownerId: '',
  status: '',
  search: ''
}

export default function TasksView() {
  const [tasks, setTasks] = useState<TaskDTO[]>([])
  const [team, setTeam] = useState<TeamMemberDTO[]>([])
  const [clients, setClients] = useState<ClientDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [sortKey, setSortKey] = useState<SortKey>('endDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.view === 'mine') params.set('mine', 'true')
    if (filters.ownerId) params.set('ownerId', filters.ownerId)
    if (filters.clientId) params.set('clientId', filters.clientId)
    if (filters.status) params.set('status', filters.status)
    if (filters.search) params.set('search', filters.search)

    const [tasksRes, teamRes, clientsRes] = await Promise.all([
      fetch(`/api/tasks?${params.toString()}`),
      fetch('/api/team'),
      fetch('/api/clients')
    ])
    setTasks(await tasksRes.json())
    setTeam(await teamRes.json())
    setClients(await clientsRes.json())
    setLoading(false)
  }, [filters])

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const owners = useMemo(
    () =>
      team
        .filter((t) => t.matchedUser)
        .map((t) => ({ id: t.matchedUser!.id, name: t.matchedUser!.name || t.email, email: t.email })),
    [team]
  )

  const sortedTasks = useMemo(() => {
    const arr = [...tasks]
    arr.sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      switch (sortKey) {
        case 'title':
          av = a.title.toLowerCase()
          bv = b.title.toLowerCase()
          break
        case 'clientName':
          av = (a.clientName || '').toLowerCase()
          bv = (b.clientName || '').toLowerCase()
          break
        case 'owner':
          av = (a.owner.name || a.owner.email).toLowerCase()
          bv = (b.owner.name || b.owner.email).toLowerCase()
          break
        case 'startDate':
          av = a.startDate || ''
          bv = b.startDate || ''
          break
        case 'endDate':
          av = a.endDate || ''
          bv = b.endDate || ''
          break
        case 'status':
          av = a.status
          bv = b.status
          break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [tasks, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  async function deleteTask(t: TaskDTO) {
    if (!confirm(`Eliminare il task "${t.title}" e tutti i suoi sub-task?`)) return
    await fetch(`/api/tasks/${t.id}`, { method: 'DELETE' })
    loadAll()
  }

  function exportXls() {
    const rows = sortedTasks.map((t) => ({
      Cliente: t.clientName || '',
      Task: t.title,
      Descrizione: t.description || '',
      Owner: t.owner.name || t.owner.email,
      'Data avvio': t.startDate ? t.startDate.slice(0, 10) : '',
      'Data fine': t.endDate ? t.endDate.slice(0, 10) : '',
      Stato: STATUS_LABELS[t.status],
      'Avanzamento %': t.progress,
      'Sub-task': t.subtasks.length,
      'Sub-task completati': t.subtasks.filter((s) => s.status === 'completato').length
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Task')
    XLSX.writeFile(wb, `task-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      onClick={() => toggleSort(k)}
      className="cursor-pointer px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-brand-600"
    >
      {label} {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </th>
  )

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Task' }]} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-slate-800">Task</h1>
        <div className="flex gap-2">
          <button
            onClick={loadAll}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ↻ Aggiorna
          </button>
          <button
            onClick={exportXls}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Esporta XLS
          </button>
          <button
            onClick={() => {
              setEditingTask(null)
              setShowForm(true)
            }}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            + Nuovo Task
          </button>
        </div>
      </div>

      <Filters filters={filters} onChange={setFilters} clients={clients} owners={owners} />

      <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <SortHeader label="Task" k="title" />
              <SortHeader label="Cliente" k="clientName" />
              <SortHeader label="Owner" k="owner" />
              <SortHeader label="Data avvio" k="startDate" />
              <SortHeader label="Data fine" k="endDate" />
              <SortHeader label="Stato" k="status" />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Avanz.</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-400">
                  Caricamento...
                </td>
              </tr>
            )}
            {!loading && sortedTasks.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-400">
                  Nessun task trovato.
                </td>
              </tr>
            )}
            {sortedTasks.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2">
                  <Link href={`/tasks/${t.id}`} className="text-brand-600 font-semibold hover:underline">
                    {t.title}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {t.clientId ? (
                    <Link href={`/clients/${t.clientId}`} className="text-brand-600 font-medium hover:underline">
                      {t.clientName}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">{t.owner.name || t.owner.email}</td>
                <td className="px-3 py-2">{t.startDate ? t.startDate.slice(0, 10) : '—'}</td>
                <td className="px-3 py-2">{t.endDate ? t.endDate.slice(0, 10) : '—'}</td>
                <td className="px-3 py-2">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[t.status])}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="px-3 py-2 w-32">
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${t.progress}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{t.progress}%</span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    onClick={() => {
                      setEditingTask(t)
                      setShowForm(true)
                    }}
                    className="text-xs text-brand-600 font-medium hover:underline mr-3"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => deleteTask(t)}
                    className="text-xs text-red-500 font-medium hover:underline"
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <TaskFormModal
          owners={owners}
          clients={clients}
          task={editingTask || undefined}
          onClose={() => {
            setShowForm(false)
            setEditingTask(null)
          }}
          onSaved={() => {
            setShowForm(false)
            setEditingTask(null)
            loadAll()
          }}
        />
      )}
    </div>
  )
}
