'use client'

import PageBar, { BTN, BTN_PRIMARY } from './PageBar'
import DataTable, { type Column } from './DataTable'
import { formatDate } from '@/lib/formatDate'
import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import clsx from 'clsx'
import { STATUS_COLORS, STATUS_LABELS, countActiveSubtasks } from '@/lib/taskStatus'
import type { TaskDTO, TeamMemberDTO, ClientDTO } from '@/types'
import TaskFormModal from './TaskFormModal'
import Filters, { FilterState } from './Filters'
import TasksKanban from './TasksKanban'
import SavedViews from './SavedViews'
import { isViewScope, type ViewScope } from '@/lib/scopesShared'
import { useScopes } from '@/lib/useScopes'
import SubtaskCount from './SubtaskCount'
import { EditIcon, DeleteIcon, ArrowLeftIcon, ArrowRightIcon, RefreshIcon, KanbanIcon, ListIcon} from './icons'

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
    view: isViewScope(searchParams.get('scope')) ? (searchParams.get('scope') as ViewScope) : 'mine',
    clientId: searchParams.get('clientId') || '',
    ownerId: searchParams.get('ownerId') || '',
    status: searchParams.get('status') || '',
    search: '',
    overdue: searchParams.get('overdue') === 'true',
    includeClosed: searchParams.get('closed') === 'true'
  }))
  // vista standard effettiva: se quella scelta non e' disponibile (es. vista salvata da un altro ruolo) si usa la piu' ampia
  const scopes = useScopes()
  const scope: ViewScope = scopes.includes(filters.view) ? filters.view : scopes[scopes.length - 1]
  const [sortKey, setSortKey] = useState<SortKey>('endDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

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
    params.set('scope', scope)
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
  }, [filters, scope])

  useEffect(() => {
    loadAll()
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, scope])

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

  // Azione multipla: applica lo stesso PATCH a tutti i task selezionati e riporta quanti sono falliti
  // (ad esempio per mancanza di permessi sul task di un altro).
  async function bulkUpdate(body: Record<string, unknown>) {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setBulkBusy(true)
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
          .then((r) => r.ok)
          .catch(() => false)
      )
    )
    const failed = results.filter((ok) => !ok).length
    setBulkBusy(false)
    setSelected(new Set())
    if (failed > 0) alert(`${failed} task su ${ids.length} non sono stati modificati (permessi insufficienti o errore).`)
    loadAll()
  }

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
        'Sub-task attivi': countActiveSubtasks(t.subtasks.map((s) => s.status)),
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

  const columns: Column<TaskDTO>[] = [
    {
      id: 'title',
      exportValue: (r) => r.title,
      label: 'Task',
      sortKey: 'title',
      primary: true,
      tdClassName: 'max-w-xs',
      render: (t) => (
        <Link href={`/tasks/${t.id}`} className="block truncate text-brand-600 font-semibold hover:underline" title={t.title}>
          {t.title}
        </Link>
      )
    },
    {
      id: 'client',
      exportValue: (r) => r.clientName || '',
      label: 'Cliente',
      sortKey: 'clientName',
      tdClassName: 'max-w-[160px]',
      render: (t) =>
        t.clientId ? (
          <Link href={`/clients/${t.clientId}`} className="block truncate text-brand-600 font-medium hover:underline" title={t.clientName || ''}>
            {t.clientName}
          </Link>
        ) : (
          <span className="text-slate-400">—</span>
        )
    },
    {
      id: 'owner',
      exportValue: (r) => r.owner.name || r.owner.email,
      label: 'Owner',
      sortKey: 'owner',
      render: (t) => (
        <Link href={`/owners/${t.owner.id}`} className="text-brand-600 hover:underline">
          {t.owner.name || t.owner.email}
        </Link>
      )
    },
    { id: 'startDate',
      exportValue: (r) => formatDate(r.startDate), label: 'Data avvio', sortKey: 'startDate', render: (t) => formatDate(t.startDate) },
    {
      id: 'endDate',
      exportValue: (r) => formatDate(r.endDate),
      label: 'Scadenza',
      sortKey: 'endDate',
      render: (t) => (
        <span
          className={clsx(
            t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completato' && t.status !== 'annullato'
              ? 'text-red-600 font-semibold'
              : ''
          )}
        >
          {formatDate(t.endDate)}
        </span>
      )
    },
    {
      id: 'status',
      exportValue: (r) => STATUS_LABELS[r.status],
      label: 'Stato',
      sortKey: 'status',
      render: (t) => (
        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[t.status])}>{STATUS_LABELS[t.status]}</span>
      )
    },
    {
      id: 'subtasks',
      exportValue: (r) => countActiveSubtasks(r.subtasks.map((x) => x.status)),
      label: 'Sub-task attivi',
      title: 'Sub-task ancora da fare (da avviare o in corso)',
      align: 'center',
      render: (t) => <SubtaskCount active={countActiveSubtasks(t.subtasks.map((s) => s.status))} total={t.subtasks.length} />
    },
    {
      id: 'actions',
      label: 'Azioni',
      fixed: true,
      align: 'right',
      tdClassName: 'whitespace-nowrap',
      render: (t) => (
        <>
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
          <button onClick={() => deleteTask(t)} className="inline-flex text-slate-400 hover:text-red-600 align-middle" title="Elimina">
            <DeleteIcon />
          </button>
        </>
      )
    }
  ]

  return (
    <div>
      <PageBar
        left={
          <SavedViews
          page="tasks"
          current={{ filters: { ...filters, view: scope }, sortKey, sortDir }}
          scopes={scopes}
          scope={scope}
          onScope={(v) => {
            setFilters((f) => ({ ...f, view: v }))
            setPage(1)
          }}
          onApply={(d) => {
            if (d?.filters) setFilters(d.filters)
            if (d?.sortKey) setSortKey(d.sortKey)
            if (d?.sortDir) setSortDir(d.sortDir)
            setPage(1)
          }}
        />
        }
        right={
          <>
          <div className="flex h-9 bg-slate-100 rounded-lg p-0.5">
            {(['table', 'kanban'] as const).map((v) => (
              <button
                key={v}
                onClick={() => changeViewMode(v)}
                className={clsx(
                  'px-3 h-full rounded-md text-sm font-medium transition',
                  viewMode === v ? 'bg-white shadow text-brand-700' : 'text-slate-500'
                )}
              >
                {v === 'table' ? <><ListIcon /> Tabella</> : <><KanbanIcon /> Kanban</>}
              </button>
            ))}
          </div>
          <button
            onClick={loadAll}
            className={BTN}
          >
            <RefreshIcon /> Aggiorna
          </button>
          <button
            onClick={() => {
              setEditingTask(null)
              setShowForm(true)
            }}
            title="Nuovo task" aria-label="Nuovo task"
            className={BTN_PRIMARY}
          >
            + Nuovo
          </button>
          </>
        }
      />
      <Filters filters={filters} onChange={setFilters} clients={clients} owners={owners} />

      {selected.size > 0 && viewMode === 'table' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
          <span className="font-medium text-brand-700">{selected.size} selezionati</span>
          <select
            disabled={bulkBusy}
            value=""
            onChange={(e) => e.target.value && bulkUpdate({ status: e.target.value })}
            className="border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
            aria-label="Cambia stato"
          >
            <option value="">Cambia stato…</option>
            <option value="da_avviare">Da avviare</option>
            <option value="in_corso">In corso</option>
            <option value="completato">Completato</option>
            <option value="annullato">Annullato</option>
            <option value="auto">Automatico (dai sotto-task)</option>
          </select>
          <select
            disabled={bulkBusy}
            value=""
            onChange={(e) => e.target.value && bulkUpdate({ ownerId: e.target.value })}
            className="border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
            aria-label="Cambia owner"
          >
            <option value="">Cambia owner…</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-slate-500 hover:text-brand-600">
            Deseleziona
          </button>
        </div>
      )}

      {viewMode === 'kanban' ? (
        <div className="mt-4">
          <TasksKanban tasks={filteredTasks} showCancelled={filters.includeClosed} onStatusChange={changeTaskStatus} />
        </div>
      ) : (
        <>
      <div className="mt-4">
        <DataTable
          tableId="tasks"
          exportRows={filteredTasks}
          exportName="task"
          selected={selected}
          onSelectedChange={setSelected}
          fullExport={{ label: 'Tutto: task e sub-task (Excel, 2 fogli)', run: exportXls }}
          columns={columns}
          rows={pagedTasks}
          rowKey={(t) => t.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(k) => toggleSort(k as SortKey)}
          loading={loading}
          emptyText={
            <>Nessun task trovato. (I completati/annullati sono nascosti per default: usa &quot;Mostra completati/annullati&quot; o il filtro Stato per vederli.)</>
          }
        />
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
              className="px-3 h-9 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
            >
              <ArrowLeftIcon /> Precedente
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 h-9 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
            >
              Successiva <ArrowRightIcon />
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
