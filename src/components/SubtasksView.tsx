'use client'

import { formatNumber } from '@/lib/formatNumber'
import { CheckboxIcon, ArrowLeftIcon, ArrowRightIcon, RefreshIcon, WarningIcon} from './icons'
import { filterSelectClass } from '@/lib/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import PageBar, { BTN } from './PageBar'
import DataTable, { type Column } from './DataTable'
import Combobox from './Combobox'
import SavedViews from './SavedViews'
import RecurrenceBadge from './RecurrenceBadge'
import { formatDate } from '@/lib/formatDate'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/taskStatus'
import { isViewScope, type ViewScope } from '@/lib/scopesShared'
import { useScopes } from '@/lib/useScopes'

interface Row {
  id: string
  title: string
  status: 'da_avviare' | 'in_corso' | 'completato' | 'annullato'
  startDate: string
  endDate: string | null
  owner: { id: string; name: string | null; email: string }
  taskId: string
  taskTitle: string
  clientId: string | null
  clientName: string | null
  recurrence: string | null
}

interface Filters {
  view: ViewScope
  ownerId: string
  status: string
  search: string
  overdue: boolean
  includeClosed: boolean
}

const PAGE_SIZE = 20

// Elenco di tutti i sub-task visibili, con le stesse viste standard (miei / del mio team / tutti) e salvate dei Task.
export default function SubtasksView() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    view: 'mine',
    ownerId: '',
    status: '',
    search: '',
    overdue: false,
    includeClosed: false
  })
  const [sortKey, setSortKey] = useState('endDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const scopes = useScopes()
  const scope: ViewScope = scopes.includes(filters.view) ? filters.view : scopes[scopes.length - 1]

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/subtasks?scope=${scope}`)
    setRows(res.ok ? await res.json() : [])
    setLoading(false)
  }, [scope])

  useEffect(() => {
    load()
  }, [load])

  const owners = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of rows) m.set(r.owner.id, r.owner.name || r.owner.email)
    return Array.from(m, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [rows])

  const sorted = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    const now = new Date()
    const list = rows.filter((r) => {
      if (!filters.includeClosed && (r.status === 'completato' || r.status === 'annullato')) return false
      if (filters.ownerId && r.owner.id !== filters.ownerId) return false
      if (filters.status && r.status !== filters.status) return false
      if (filters.overdue && !(r.endDate && new Date(r.endDate) < now && r.status !== 'completato' && r.status !== 'annullato')) return false
      if (q && !`${r.title} ${r.taskTitle} ${r.clientName ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
    const val = (r: Row): string => {
      switch (sortKey) {
        case 'title':
          return r.title.toLowerCase()
        case 'task':
          return r.taskTitle.toLowerCase()
        case 'client':
          return (r.clientName ?? '').toLowerCase()
        case 'owner':
          return (r.owner.name || r.owner.email).toLowerCase()
        case 'status':
          return r.status
        case 'startDate':
          return r.startDate
        default:
          return r.endDate ?? '9999'
      }
    }
    list.sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * (sortDir === 'asc' ? 1 : -1))
    return list
  }, [rows, filters, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function onSort(key: string) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const columns: Column<Row>[] = [
    {
      id: 'title',
      label: 'Sub-task',
      sortKey: 'title',
      primary: true,
      exportValue: (r) => r.title,
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <Link href={`/subtasks/${r.id}`} className="font-medium text-slate-800 hover:text-brand-700 hover:underline">
            {r.title}
          </Link>
          <RecurrenceBadge recurrence={r.recurrence} />
        </span>
      )
    },
    {
      id: 'task',
      label: 'Task',
      sortKey: 'task',
      exportValue: (r) => r.taskTitle,
      tdClassName: 'max-w-[200px]',
      render: (r) => (
        <Link href={`/tasks/${r.taskId}`} className="block truncate text-brand-600 hover:underline" title={r.taskTitle}>
          {r.taskTitle}
        </Link>
      )
    },
    {
      id: 'client',
      label: 'Cliente',
      sortKey: 'client',
      exportValue: (r) => r.clientName || '',
      tdClassName: 'max-w-[160px]',
      render: (r) =>
        r.clientId ? (
          <Link href={`/clients/${r.clientId}`} className="block truncate text-brand-600 font-medium hover:underline" title={r.clientName || ''}>
            {r.clientName}
          </Link>
        ) : (
          <span className="text-slate-400">—</span>
        )
    },
    {
      id: 'owner',
      label: 'Owner',
      sortKey: 'owner',
      exportValue: (r) => r.owner.name || r.owner.email,
      render: (r) => (
        <Link href={`/owners/${r.owner.id}`} className="text-brand-600 hover:underline">
          {r.owner.name || r.owner.email}
        </Link>
      )
    },
    { id: 'startDate', label: 'Data avvio', sortKey: 'startDate', exportValue: (r) => formatDate(r.startDate), render: (r) => formatDate(r.startDate) },
    {
      id: 'endDate',
      label: 'Scadenza',
      sortKey: 'endDate',
      exportValue: (r) => formatDate(r.endDate),
      render: (r) => (
        <span
          className={clsx(
            r.endDate && new Date(r.endDate) < new Date() && r.status !== 'completato' && r.status !== 'annullato'
              ? 'text-red-600 font-semibold'
              : ''
          )}
        >
          {formatDate(r.endDate)}
        </span>
      )
    },
    {
      id: 'status',
      label: 'Stato',
      sortKey: 'status',
      exportValue: (r) => STATUS_LABELS[r.status],
      render: (r) => <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</span>
    }
  ]

  function set(patch: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  return (
    <div>
      <PageBar
        left={
        <SavedViews
        page="subtasks"
        current={{ filters: { ...filters, view: scope }, sortKey, sortDir }}
        scopes={scopes}
        scope={scope}
        onScope={(v) => set({ view: v })}
        onApply={(d: any) => {
          if (d?.filters) {
            const f = d.filters
            setFilters({
              view: isViewScope(f.view) ? f.view : 'all',
              ownerId: f.ownerId || '',
              status: f.status || '',
              search: f.search || '',
              overdue: !!f.overdue,
              includeClosed: !!f.includeClosed
            })
          }
          if (d?.sortKey) setSortKey(d.sortKey)
          if (d?.sortDir) setSortDir(d.sortDir)
          setPage(1)
        }}
      />
        }
        right={
          <button onClick={load} className={BTN}>
            <RefreshIcon /> Aggiorna
          </button>
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2 mb-3">
        <Combobox
          value={filters.ownerId}
          onChange={(id) => set({ ownerId: id })}
          options={owners}
          emptyLabel="Tutti gli owner"
          placeholder="Cerca owner..."
          className="w-full sm:w-48"
        />
        <select
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
          className={filterSelectClass(filters.status)}
        >
          <option value="">Tutti gli stati</option>
          <option value="da_avviare">Da avviare</option>
          <option value="in_corso">In corso</option>
          <option value="completato">Completato</option>
          <option value="annullato">Annullato</option>
        </select>
        <button
          onClick={() => set({ overdue: !filters.overdue })}
          className={clsx(
            'px-3 h-9 rounded-lg text-sm font-medium border transition',
            filters.overdue ? 'bg-red-50 border-red-200 text-red-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
          )}
        >
          <WarningIcon /> In ritardo
        </button>
        <button
          onClick={() => set({ includeClosed: !filters.includeClosed })}
          title="Per default i sub-task completati e annullati sono nascosti"
          className={clsx(
            'px-3 h-9 rounded-lg text-sm font-medium border transition',
            filters.includeClosed ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
          )}
        >
          <CheckboxIcon checked={filters.includeClosed} /> Mostra completati/annullati
        </button>
        <input
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Cerca per sub-task, task o cliente..."
          className="border border-slate-200 rounded-lg px-3 h-9 text-sm flex-1 min-w-[180px]"
        />
      </div>

      <DataTable
        tableId="subtasks"
        columns={columns}
        rows={paged}
        rowKey={(r) => r.id}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        loading={loading}
        emptyText="Nessun sub-task con questi filtri."
        exportRows={sorted}
        exportName="sub-task"
      />

      {sorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-3 text-sm text-slate-600">
          <span>
            {formatNumber(sorted.length)} sub-task totali — pagina {page} di {totalPages}
          </span>
          <div className="flex gap-2">
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
    </div>
  )
}
