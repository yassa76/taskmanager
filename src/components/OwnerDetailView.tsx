'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/taskStatus'
import Breadcrumbs from './Breadcrumbs'

interface OwnerTask {
  id: string
  title: string
  clientId: string | null
  clientName: string | null
  startDate: string | null
  endDate: string | null
  status: 'da_avviare' | 'in_corso' | 'completato' | 'annullato'
  progress: number
  overdue: boolean
}

interface OwnerSubtask {
  id: string
  title: string
  status: 'da_avviare' | 'in_corso' | 'completato' | 'annullato'
  endDate: string | null
  taskId: string
  taskTitle: string
  clientId: string | null
  clientName: string | null
  overdue: boolean
}

interface OwnerData {
  owner: { id: string; name: string | null; email: string; image: string | null; role: string }
  tasks: OwnerTask[]
  subtasks: OwnerSubtask[]
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  normal: 'Normale',
  read_only: 'Sola lettura'
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={clsx('text-2xl font-bold mt-1', accent || 'text-slate-800')}>{value}</p>
    </div>
  )
}

export default function OwnerDetailView({ ownerId }: { ownerId: string }) {
  const [data, setData] = useState<OwnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [includeClosed, setIncludeClosed] = useState(false)

  const [subStatusFilter, setSubStatusFilter] = useState('')
  const [subClientFilter, setSubClientFilter] = useState('')
  const [subOverdueOnly, setSubOverdueOnly] = useState(false)
  const [subSearch, setSubSearch] = useState('')
  const [subIncludeClosed, setSubIncludeClosed] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/owners/${ownerId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || `Errore nel caricare la persona (status ${res.status})`)
        return
      }
      setData(await res.json())
    } catch (e: any) {
      setError(`Errore imprevisto: ${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId])

  const clientOptions = useMemo(() => {
    if (!data) return []
    const map = new Map<string, string>()
    data.tasks.forEach((t) => t.clientId && t.clientName && map.set(t.clientId, t.clientName))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [data])

  const filteredTasks = useMemo(() => {
    if (!data) return []
    return data.tasks
      .filter((t) =>
        statusFilter
          ? t.status === statusFilter
          : includeClosed || (t.status !== 'completato' && t.status !== 'annullato')
      )
      .filter((t) => !clientFilter || t.clientId === clientFilter)
      .filter((t) => !overdueOnly || t.overdue)
      .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (!a.endDate) return 1
        if (!b.endDate) return -1
        return a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0
      })
  }, [data, statusFilter, clientFilter, overdueOnly, search, includeClosed])

  const subtaskClientOptions = useMemo(() => {
    if (!data) return []
    const map = new Map<string, string>()
    data.subtasks.forEach((s) => s.clientId && s.clientName && map.set(s.clientId, s.clientName))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [data])

  const visibleSubtasks = useMemo(() => {
    if (!data) return []
    return data.subtasks
      .filter((s) =>
        subStatusFilter
          ? s.status === subStatusFilter
          : subIncludeClosed || (s.status !== 'completato' && s.status !== 'annullato')
      )
      .filter((s) => !subClientFilter || s.clientId === subClientFilter)
      .filter((s) => !subOverdueOnly || s.overdue)
      .filter((s) => !subSearch || s.title.toLowerCase().includes(subSearch.toLowerCase()))
      .sort((a, b) => {
        if (!a.endDate) return 1
        if (!b.endDate) return -1
        return a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0
      })
  }, [data, subStatusFilter, subClientFilter, subOverdueOnly, subSearch, subIncludeClosed])

  if (loading) return <p className="text-slate-400">Caricamento...</p>
  if (error) return <p className="text-red-500">{error}</p>
  if (!data) return <p className="text-slate-400">Persona non trovata.</p>

  const { owner, tasks, subtasks } = data
  const kpi = {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'in_corso').length,
    notStarted: tasks.filter((t) => t.status === 'da_avviare').length,
    overdueTasks: tasks.filter((t) => t.overdue).length,
    overdueSubtasks: subtasks.filter((s) => s.overdue).length
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Team', href: '/team' }, { label: owner.name || owner.email }]} />

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex items-center gap-4">
        {owner.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={owner.image} alt="" className="w-14 h-14 rounded-full" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-lg">
            {(owner.name || owner.email).slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">{owner.name || owner.email}</h1>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {ROLE_LABELS[owner.role] || owner.role}
            </span>
          </div>
          <p className="text-sm text-slate-500">{owner.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Task assegnati" value={kpi.total} />
        <KpiCard label="In corso" value={kpi.inProgress} accent="text-amber-600" />
        <KpiCard label="Da avviare" value={kpi.notStarted} />
        <KpiCard label="Task in ritardo" value={kpi.overdueTasks} accent="text-red-600" />
        <KpiCard label="Sub-task in ritardo" value={kpi.overdueSubtasks} accent="text-red-600" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Task assegnati</h2>
        </div>

        <div className="p-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Tutti gli stati</option>
            <option value="da_avviare">Da avviare</option>
            <option value="in_corso">In corso</option>
            <option value="completato">Completato</option>
            <option value="annullato">Annullato</option>
          </select>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Tutti i clienti</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setOverdueOnly((v) => !v)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition',
              overdueOnly ? 'bg-red-50 border-red-200 text-red-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            )}
          >
            ⚠ In ritardo
          </button>
          <button
            onClick={() => setIncludeClosed((v) => !v)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition',
              includeClosed
                ? 'bg-slate-100 border-slate-300 text-slate-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            )}
          >
            {includeClosed ? '☑' : '☐'} Mostra completati/annullati
          </button>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per titolo..."
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[160px]"
          />
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Task</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Cliente</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Scadenza</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stato</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Avanz.</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 max-w-xs">
                  <Link
                    href={`/tasks/${t.id}`}
                    className="block truncate text-brand-600 font-medium hover:underline"
                    title={t.title}
                  >
                    {t.title}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {t.clientId ? (
                    <Link href={`/clients/${t.clientId}`} className="text-brand-600 hover:underline">
                      {t.clientName}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className={clsx(t.overdue ? 'text-red-600 font-semibold' : 'text-slate-700')}>
                    {t.endDate ? t.endDate.slice(0, 10) : '—'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[t.status])}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="px-4 py-2 w-28">
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${t.progress}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{t.progress}%</span>
                </td>
              </tr>
            ))}
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  Nessun task trovato con questi filtri. (I completati/annullati sono nascosti per
                  default: selezionali dal filtro Stato per vederli.)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Sub-task</h2>
        </div>

        <div className="p-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
          <select
            value={subStatusFilter}
            onChange={(e) => setSubStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Tutti gli stati</option>
            <option value="da_avviare">Da avviare</option>
            <option value="in_corso">In corso</option>
            <option value="completato">Completato</option>
            <option value="annullato">Annullato</option>
          </select>
          <select
            value={subClientFilter}
            onChange={(e) => setSubClientFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Tutti i clienti</option>
            {subtaskClientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSubOverdueOnly((v) => !v)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition',
              subOverdueOnly
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            )}
          >
            ⚠ In ritardo
          </button>
          <button
            onClick={() => setSubIncludeClosed((v) => !v)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition',
              subIncludeClosed
                ? 'bg-slate-100 border-slate-300 text-slate-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            )}
          >
            {subIncludeClosed ? '☑' : '☐'} Mostra completati/annullati
          </button>
          <input
            value={subSearch}
            onChange={(e) => setSubSearch(e.target.value)}
            placeholder="Cerca per titolo..."
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[160px]"
          />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Sub-task</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Task</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Cliente</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Scadenza</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stato</th>
            </tr>
          </thead>
          <tbody>
            {visibleSubtasks.map((s) => (
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
                <td className="px-4 py-2 max-w-[160px] truncate" title={s.taskTitle}>
                  <Link href={`/tasks/${s.taskId}`} className="text-slate-600 hover:underline">
                    {s.taskTitle}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {s.clientId ? (
                    <Link href={`/clients/${s.clientId}`} className="text-brand-600 hover:underline">
                      {s.clientName}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className={clsx(s.overdue ? 'text-red-600 font-semibold' : 'text-slate-700')}>
                    {s.endDate ? s.endDate.slice(0, 10) : '—'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[s.status])}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </td>
              </tr>
            ))}
            {visibleSubtasks.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  Nessun sub-task trovato con questi filtri. (I completati/annullati sono
                  nascosti per default: selezionali dal filtro Stato per vederli.)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
