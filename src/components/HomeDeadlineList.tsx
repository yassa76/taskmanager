'use client'

import { formatNumber } from '@/lib/formatNumber'
import { ArrowLeftIcon, ArrowRightIcon } from './icons'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import RecurrenceBadge from './RecurrenceBadge'

export interface DeadlineRow {
  id: string
  href: string
  title: string
  // seconda riga in piccolo: cliente (task) o task padre (sub-task)
  sub?: string | null
  subHref?: string | null
  ownerId?: string
  ownerName?: string
  recurrence?: string | null
  endDate: string | null
  status: 'da_avviare' | 'in_corso' | 'completato' | 'annullato'
  overdue: boolean
}

type Filter = 'tutti' | 'scaduti' | 'settimana'
type Horizon = '30' | 'all'
const PAGE_SIZES = [15, 30, 50]

function getInitials(name?: string) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Giorni di calendario da oggi (negativo = scaduto), ignorando l'ora.
function dayDiff(endDate: string): number {
  const e = new Date(endDate)
  const t = new Date()
  const a = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate())
  const b = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())
  return Math.round((a - b) / 86400000)
}

function shortDate(endDate: string) {
  const d = new Date(endDate)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
}

function DeadlineBadge({ endDate, overdue }: { endDate: string | null; overdue: boolean }) {
  if (!endDate) return <span className="text-slate-300">—</span>
  const days = dayDiff(endDate)
  let label: string
  if (days < 0) label = `scaduto da ${-days}gg`
  else if (days === 0) label = 'oggi'
  else if (days === 1) label = 'domani'
  else label = `tra ${days}gg`
  const tone =
    overdue || days < 0
      ? 'bg-red-100 text-red-700'
      : days <= 3
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600'
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-slate-500 tabular-nums">{shortDate(endDate)}</span>
      <span className={clsx('px-1.5 py-0.5 rounded-full text-xs font-medium', tone)}>{label}</span>
    </span>
  )
}

const STATUS_DOT: Record<DeadlineRow['status'], { cls: string; label: string }> = {
  da_avviare: { cls: 'bg-slate-300', label: 'Da avviare' },
  in_corso: { cls: 'bg-amber-500', label: 'In corso' },
  completato: { cls: 'bg-emerald-500', label: 'Completato' },
  annullato: { cls: 'bg-slate-400', label: 'Annullato' }
}

export default function HomeDeadlineList({
  title,
  firstColLabel,
  subColLabel,
  emptyText,
  rows,
  anchorId
}: {
  title: string
  firstColLabel: string
  subColLabel: string
  emptyText: string
  rows: DeadlineRow[]
  anchorId?: string
}) {
  const [filter, setFilter] = useState<Filter>('tutti')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [horizon, setHorizon] = useState<Horizon>('30')

  // Preferenze condivise dalle due liste, ricordate nel browser
  useEffect(() => {
    try {
      const ps = Number(localStorage.getItem('homeListPageSize'))
      if (PAGE_SIZES.includes(ps)) setPageSize(ps)
      const h = localStorage.getItem('homeListHorizon')
      if (h === '30' || h === 'all') setHorizon(h)
    } catch {}
  }, [])
  function changePageSize(n: number) {
    setPageSize(n)
    try {
      localStorage.setItem('homeListPageSize', String(n))
    } catch {}
  }
  function changeHorizon(h: Horizon) {
    setHorizon(h)
    try {
      localStorage.setItem('homeListHorizon', h)
    } catch {}
  }

  // Con orizzonte 30 giorni: ritardi + scadenze entro 30 giorni
  const scoped = useMemo(
    () => (horizon === 'all' ? rows : rows.filter((r) => r.overdue || (!!r.endDate && dayDiff(r.endDate) <= 30))),
    [rows, horizon]
  )

  const counts = useMemo(() => {
    let scaduti = 0
    let settimana = 0
    for (const r of scoped) {
      if (!r.endDate) continue
      const d = dayDiff(r.endDate)
      if (r.overdue || d < 0) scaduti++
      else if (d <= 7) settimana++
    }
    return { tutti: scoped.length, scaduti, settimana }
  }, [scoped])

  // Gli scaduti vengono prima, poi i piu' vicini (le righe arrivano gia' per data).
  const visible = useMemo(() => {
    const isLate = (r: DeadlineRow) => r.overdue || (!!r.endDate && dayDiff(r.endDate) < 0)
    const list = scoped.filter((r) => {
      if (filter === 'tutti') return true
      if (!r.endDate) return false
      if (filter === 'scaduti') return isLate(r)
      const d = dayDiff(r.endDate)
      return !isLate(r) && d <= 7
    })
    return [...list].sort((a, b) => {
      const la = isLate(a) ? 0 : 1
      const lb = isLate(b) ? 0 : 1
      if (la !== lb) return la - lb
      return (a.endDate || '').localeCompare(b.endDate || '')
    })
  }, [scoped, filter])

  useEffect(() => {
    setPage(1)
  }, [filter, scoped, pageSize])

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize))
  const paged = visible.slice((page - 1) * pageSize, page * pageSize)
  const from = visible.length === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(visible.length, page * pageSize)

  const chips: { key: Filter; label: string }[] = [
    { key: 'tutti', label: 'Tutti' },
    { key: 'scaduti', label: 'Scaduti' },
    { key: 'settimana', label: 'Questa settimana' }
  ]

  return (
    <div id={anchorId} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm scroll-mt-20">
      <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-800 text-base">{title}</h2>
        <div className="flex flex-wrap items-center gap-1">
          <select
            value={horizon}
            onChange={(e) => changeHorizon(e.target.value as Horizon)}
            className="border border-slate-200 rounded-full px-2 h-8 text-sm text-slate-600 mr-1"
            title="Quali scadenze mostrare"
          >
            <option value="30">Prossimi 30 giorni</option>
            <option value="all">Tutte le scadenze</option>
          </select>
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={clsx(
                'px-3 h-8 rounded-full text-sm font-medium border transition',
                filter === c.key
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-100'
              )}
            >
              {c.label} ({formatNumber(counts[c.key])})
            </button>
          ))}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-3 py-1.5 text-left text-xs font-semibold text-slate-500 uppercase">{firstColLabel}</th>
            <th className="px-3 py-1.5 text-left text-xs font-semibold text-slate-500 uppercase w-14">Owner</th>
            <th className="px-3 py-1.5 text-left text-xs font-semibold text-slate-500 uppercase">Scadenza</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((r) => {
            const late = r.overdue || (!!r.endDate && dayDiff(r.endDate) < 0)
            const dot = STATUS_DOT[r.status]
            return (
              <tr key={r.id} className={clsx('border-b border-slate-100 hover:bg-slate-50', late && 'bg-red-50/60')}>
                <td className="px-3 py-1.5 max-w-0 w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={clsx('w-2 h-2 rounded-full shrink-0', dot.cls)} title={dot.label} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link href={r.href} className="block truncate text-brand-600 font-medium hover:underline" title={r.title}>
                          {r.title}
                        </Link>
                        <RecurrenceBadge recurrence={r.recurrence} />
                      </div>
                      {r.sub && (
                        <div className="truncate text-xs text-slate-400" title={`${subColLabel}: ${r.sub}`}>
                          {r.subHref ? (
                            <Link href={r.subHref} className="hover:underline">
                              {r.sub}
                            </Link>
                          ) : (
                            r.sub
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-slate-500">
                  {r.ownerId ? (
                    <Link href={`/owners/${r.ownerId}`} className="hover:underline" title={r.ownerName}>
                      {getInitials(r.ownerName)}
                    </Link>
                  ) : (
                    <span title={r.ownerName}>{getInitials(r.ownerName)}</span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <DeadlineBadge endDate={r.endDate} overdue={r.overdue} />
                </td>
              </tr>
            )
          })}
          {visible.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center py-5 text-slate-400">
                {rows.length === 0 ? emptyText : 'Nessun elemento per questo filtro.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-t border-slate-100 text-sm text-slate-500">
        <span>
          {formatNumber(from)}–{formatNumber(to)} di {formatNumber(visible.length)}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => changePageSize(Number(e.target.value))}
            className="border border-slate-200 rounded px-1.5 h-8"
            title="Righe per pagina"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} per pagina
              </option>
            ))}
          </select>
          <span>
            Pagina {page} di {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
          >
            <ArrowLeftIcon />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
          >
            <ArrowRightIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
