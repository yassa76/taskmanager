'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import clsx from 'clsx'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/taskStatus'
import type { TaskDTO, TeamMemberDTO, ClientDTO } from '@/types'
import TaskFormModal from './TaskFormModal'
import Filters, { FilterState } from './Filters'
import Breadcrumbs from './Breadcrumbs'
import TasksKanban from './TasksKanban'
import { EditIcon, DeleteIcon } from './icons'

type SortKey = 'title' | 'clientName' | 'owner' | 'startDate' | 'endDate' | 'status'
type SortDir = 'asc' | 'desc'

export default function TasksView() {
  const searchParams = useSearchParams()

  const [tasks, setTasks] = useState<TaskDTO[]>([])
  const [team, setTeam] = useState<TeamMemberDTO[]>([])
  const [clients, setClients] = useState<ClientDTO[]>([])
  const [loading, setLoading] = useState(true)
  // Filtri iniziali: possono arrivare dall'URL (es. click su un KPI in Home).
  const [filters, setFilters] = useState<FilterState>(() => ({
    view: searchParams.get('view') === 'mine' ? 'mine' : 'all',
    clientId: searchParams.get('clientId') || '',
    ownerId: searchParams.get('ownerId') || '',
    status: searchParams.get('status') || '',
    search: '',
    overdue: searchParams.get('overdue') === 'true',
    includeClosed: false
  }))
  const [sortKey, setSortKey] = useState<SortKey>('endDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')

  // Ripristina la vista scelta in precedenza (Tabella/Kanban), cosi' resta
  // valida anche navigando su altre pagine e tornando qui.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tasksViewMode') : null
    if (saved === 'table' || saved === 'kanban') setViewMode(saved)
  }, [])

  function changeViewMode(v: 'table' | 'kanban') {
    setViewMode(v)
    if (typeof window !== 'undefined') localStorage.setItem('tasksViewMode', v)
  }

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
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const owners = useMemo(
    () =>
      team
        .filter((t) => t.status !== 'inactive' && t.matchedUser)
        .map((t) => ({ id: t.matchedUser!.id, name: t.matchedUser!.name || t.email, email: t.email }))
        .sort((a, b) => a.name.localeCompare(b.name)),
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

  // Il filtro "in ritardo" e' derivato (non e' una colonna sul DB), quindi si applica lato client.
  // Per default nascondiamo i task completati/annullati, a meno che l'utente non abbia scelto
  // esplicitamente quello stato dal filtro, o non abbia attivato "Mostra completati/annullati".
  const filteredTasks = useMemo(() => {
    let arr = sortedTasks
    if (!filters.status && !filters.includeClosed) {
      arr = arr.filter((t) => t.status !== 'completato' && t.status !== 'annullato')
    }
    if (filters.overdue) {
      const now = new Date()
      arr = arr.filter((t) => t.endDate && new Date(t.endDate) < now && t.status !== 'completato' && t.status !== 'annullato')
    }
    return arr
  }, [sortedTasks, filters.overdue, filters.status, filters.includeClosed])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE))
  const pagedTasks = filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function deleteTask(t: TaskDTO) {
    if (!confirm(`Eliminare il task "${t.title}"?`)) return
    const res = await fetch(`/api/tasks/${t.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      alert(body.error || `Errore nell'eliminazione (status ${res.status})`)
    }
    loadAll()
  }

  // Trascinamento tra colonne nella vista Kanban: imposta lo stato come
  // override manuale, stesso meccanismo gia' usato dal form di modifica.
  async function changeTaskStatus(taskId: string, newStatus: string) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return
    // Aggiornamento ottimistico: aggiorna subito la UI, poi conferma col server.
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as TaskDTO['status'] } : t)))
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    if (!res.ok) {
      loadAll() // qualcosa e' andato storto, ricarica per tornare allo stato reale
    }
  }

  const [exporting, setExporting] = useState(false)

  // Esporta SEMPRE tutti i task/sub-task, a prescindere dai filtri attivi in
  // quel momento sullo schermo (view, cliente, owner, stato, ricerca, in
  // ritardo, mostra completati/annullati): fa una chiamata dedicata senza
  // alcun parametro di filtro.
  async function exportXls() {
    setExporting(true)
    try {
      const res = await fetch('/api/tasks')
      const allTasks: TaskDTO[] = await res.json()

      const taskRows = allTasks.map((t) => ({
        Cliente: t.clientName || '',
        Task: t.title,
        Descrizione: t.description || '',
        Owner: t.owner.name || t.owner.email,
        'Data avvio': t.startDate ? t.startDate.slice(0, 10) : '',
        'Data scadenza': t.endDate ? t.endDate.slice(0, 10) : '',
        Stato: STATUS_LABELS[t.status],
        'Avanzamento %': t.progress,
        'Sub-task totali': t.subtasks.length,
        'Sub-task completati': t.subtasks.filter((s) => s.status === 'completato').length
      }))

      const subtaskRows = allTasks.flatMap((t) =>
        t.subtasks.map((s) => ({
          Cliente: t.clientName || '',
          Task: t.title,
          'Sub-task': s.title,
          Descrizione: s.description || '',
          Owner: s.owner.name || s.owner.email,
          'Data inizio': s.startDate ? s.startDate.slice(0, 10) : '',
          'Data scadenza': s.endDate ? s.endDate.slice(0, 10) : '',
          'Data chiusura': s.closedAt ? s.closedAt.slice(0, 10) : '',
          Stato: STATUS_LABELS[s.status as keyof typeof STATUS_LABELS] || s.status
        }))
      )

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), 'Task')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subtaskRows), 'Sub-task')
      XLSX.writeFile(wb, `task-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setExporting(false)
    }
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
        <div className="flex gap-2 items-center">
          <div className="flex bg-slate-100 rounded-lg p-1">
            {(['table', 'kanban'] as const).map((v) => (
              <button
                key={v}
                onClick={() => changeViewMode(v)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition',
                  viewMode === v ? 'bg-white shadow text-brand-700' : 'text-slate-500'
                )}
              >
                {v === 'table' ? '☰ Tabella' : '▦ Kanban'}
              </button>
            ))}
          </div>
          <button
            onClick={loadAll}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ↻ Aggiorna
          </button>
          <button
            onClick={exportXls}
            disabled={exporting}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {exporting ? 'Esportazione...' : 'Esporta XLS'}
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

      {viewMode === 'kanban' ? (
        <div className="mt-4">
          <TasksKanban tasks={filteredTasks} showCancelled={filters.includeClosed} onStatusChange={changeTaskStatus} />
        </div>
      ) : (
        <>
      <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <SortHeader label="Task" k="title" />
              <SortHeader label="Cliente" k="clientName" />
              <SortHeader label="Owner" k="owner" />
              <SortHeader label="Data avvio" k="startDate" />
              <SortHeader label="Scadenza" k="endDate" />
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
            {!loading && filteredTasks.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-400">
                  Nessun task trovato. (I completati/annullati sono nascosti per default: usa
                  &quot;Mostra completati/annullati&quot; o il filtro Stato per vederli.)
                </td>
              </tr>
            )}
            {pagedTasks.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 max-w-xs">
                  <Link
                    href={`/tasks/${t.id}`}
                    className="block truncate text-brand-600 font-semibold hover:underline"
                    title={t.title}
                  >
                    {t.title}
                  </Link>
                </td>
                <td className="px-3 py-2 max-w-[160px]">
                  {t.clientId ? (
                    <Link
                      href={`/clients/${t.clientId}`}
                      className="block truncate text-brand-600 font-medium hover:underline"
                      title={t.clientName || ''}
                    >
                      {t.clientName}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/owners/${t.owner.id}`} className="text-brand-600 hover:underline">
                    {t.owner.name || t.owner.email}
                  </Link>
                </td>
                <td className="px-3 py-2">{t.startDate ? t.startDate.slice(0, 10) : '—'}</td>
                <td className="px-3 py-2">
                  <span
                    className={clsx(
                      t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completato' && t.status !== 'annullato'
                        ? 'text-red-600 font-semibold'
                        : ''
                    )}
                  >
                    {t.endDate ? t.endDate.slice(0, 10) : '—'}
                  </span>
                </td>
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
          </tbody>
        </table>
      </div>

      {filteredTasks.length > 0 && (
        <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
          <span>
            {filteredTasks.length} task totali — pagina {page} di {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
            >
              ← Precedente
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
            >
              Successiva →
            </button>
          </div>
        </div>
      )}
        </>
      )}

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
