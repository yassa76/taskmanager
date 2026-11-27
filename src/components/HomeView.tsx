'use client'

import { GearIcon, RefreshIcon, ArrowDownIcon, ArrowUpIcon} from './icons'
import PageBar, { BTN } from './PageBar'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import ScopeSelect from './ScopeSelect'
import { useScopePref, useScopes } from '@/lib/useScopes'
import type { ViewScope } from '@/lib/scopesShared'
import clsx from 'clsx'
import DeadlineCalendar, { CalendarItem } from './DeadlineCalendar'
import HomeDeadlineList from './HomeDeadlineList'
import { useColumnPrefs } from '@/lib/useColumnPrefs'

const BLOCKS = [
  { id: 'calendar', label: 'Calendario scadenze', group: 'top' },
  { id: 'kpi', label: 'Indicatori (KPI)', group: 'top' },
  { id: 'tasks', label: 'Task in scadenza', group: 'lists' },
  { id: 'subtasks', label: 'Sub-task in scadenza', group: 'lists' }
] as const

interface UpcomingTask {
  id: string
  title: string
  clientId?: string | null
  clientName: string | null
  ownerId?: string
  ownerName?: string
  endDate: string | null
  status: 'da_avviare' | 'in_corso' | 'completato' | 'annullato'
  overdue: boolean
}

interface UpcomingSubtask {
  id: string
  title: string
  taskId: string
  taskTitle: string
  clientName: string | null
  ownerId?: string
  ownerName?: string
  endDate: string | null
  status: 'da_avviare' | 'in_corso' | 'completato'
  recurrence?: string | null
  overdue: boolean
}

interface HomeData {
  kpi: {
    totalTasks: number
    inProgress: number
    notStarted: number
    completed: number
    overdueTasks: number
    overdueSubtasks: number
  }
  upcomingTasks: UpcomingTask[]
  upcomingSubtasks: UpcomingSubtask[]
  calendarItems: CalendarItem[]
}

function KpiCard({
  label,
  value,
  accent,
  href
}: {
  label: string
  value: number
  accent?: string
  href?: string
}) {
  const content = (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm h-full flex flex-col justify-center hover:border-brand-300 hover:shadow-md transition">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={clsx('text-2xl font-bold mt-1', accent || 'text-slate-800')}>{value}</p>
    </div>
  )
  if (!href) return content
  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  )
}

export default function HomeView({ userName }: { userName: string }) {
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const { scope: savedScope, setScope: changeScope, ready } = useScopePref()
  const scopes = useScopes(true)
  // se la vista salvata non e' (piu') disponibile si usa la piu' ampia consentita
  const scope: ViewScope = scopes.includes(savedScope) ? savedScope : scopes[scopes.length - 1]
  const { pref, save, reset } = useColumnPrefs('home')
  const [customizing, setCustomizing] = useState(false)

  const defaultIds: string[] = BLOCKS.map((b) => b.id)
  const order = [...(pref?.order ?? []).filter((id) => defaultIds.includes(id)), ...defaultIds.filter((id) => !(pref?.order ?? []).includes(id))]
  const hidden = new Set(pref?.hidden ?? [])
  function moveBlock(id: string, dir: -1 | 1) {
    const i = order.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    save({ order: next, hidden: Array.from(hidden) })
  }
  function toggleBlock(id: string) {
    const h = new Set(hidden)
    if (h.has(id)) h.delete(id)
    else h.add(id)
    save({ order, hidden: Array.from(h) })
  }


  const load = useCallback(() => {
    if (!ready) return
    let stale = false
    setLoading(true)
    fetch(`/api/home?scope=${scope}`)
      .then((r) => r.json())
      .then((d) => {
        if (!stale) setData(d)
      })
      .finally(() => {
        if (!stale) setLoading(false)
      })
    return () => {
      stale = true
    }
  }, [scope, ready])

  useEffect(() => {
    return load()
  }, [load])

  // Costruisce il link verso la vista Task con i filtri giusti a seconda
  // di dove si e' cliccato e se si sta guardando "i miei" o "tutto il team".
  function tasksHref(extra: string) {
    const params = new URLSearchParams(extra)
    params.set('scope', scope)
    return `/tasks?${params.toString()}`
  }

  return (
    <div>
      <PageBar
        left={
          <>
            <span className="text-base font-medium text-slate-800 mr-1">Ciao, {userName.split(' ')[0] || userName}</span>
            <ScopeSelect value={scope} onChange={changeScope} />
          </>
        }
        right={
          <>
            <button
              onClick={() => setCustomizing((v) => !v)}
              className={'hidden lg:inline-flex ' + BTN}
              title="Scegli quali blocchi mostrare e in che ordine"
            >
              <GearIcon /> Personalizza
            </button>
            <button onClick={() => load()} className={BTN}>
              <RefreshIcon /> Aggiorna
            </button>
          </>
        }
      />

      {customizing && (
        <div className="hidden lg:block mb-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">Blocchi della Home</p>
            <button onClick={reset} className="text-xs text-brand-600 hover:underline">
              Ripristina predefiniti
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {order.map((id, i) => {
              const b = BLOCKS.find((x) => x.id === id)!
              return (
                <li key={id} className="flex items-center gap-3 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    checked={!hidden.has(id)}
                    onChange={() => toggleBlock(id)}
                    id={`blk-${id}`}
                  />
                  <label htmlFor={`blk-${id}`} className="flex-1 text-slate-700">
                    {b.label}
                  </label>
                  <button
                    onClick={() => moveBlock(id, -1)}
                    disabled={i === 0}
                    className="px-2 text-slate-500 hover:text-brand-600 disabled:opacity-30"
                    aria-label="Sposta su"
                  >
                    <ArrowUpIcon />
                  </button>
                  <button
                    onClick={() => moveBlock(id, 1)}
                    disabled={i === order.length - 1}
                    className="px-2 text-slate-500 hover:text-brand-600 disabled:opacity-30"
                    aria-label="Sposta giù"
                  >
                    <ArrowDownIcon />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {loading && <p className="text-slate-400">Caricamento...</p>}

      {!loading && data && (() => {
        const blocks: Record<string, JSX.Element> = {
          calendar: (
            <div key="calendar" className="lg:h-[200px]">
              <DeadlineCalendar items={data.calendarItems} />
            </div>
          ),
          kpi: (
            <div key="kpi" className="grid grid-cols-2 sm:grid-cols-3 auto-rows-fr gap-2 lg:h-[200px]">
              <KpiCard label={scope === 'mine' ? 'I miei task attivi' : scope === 'team' ? 'Task attivi del team' : 'Task attivi di tutti'} value={data.kpi.totalTasks} href={tasksHref('')} />
              <KpiCard label="In corso" value={data.kpi.inProgress} accent="text-amber-600" href={tasksHref('status=in_corso')} />
              <KpiCard label="Da avviare" value={data.kpi.notStarted} href={tasksHref('status=da_avviare')} />
              <KpiCard label="Task in ritardo" value={data.kpi.overdueTasks} accent="text-red-600" href={tasksHref('overdue=true')} />
              <KpiCard label="Sub-task in ritardo" value={data.kpi.overdueSubtasks} accent="text-red-600" href="#subtask-deadlines" />
              <KpiCard label="Completati" value={data.kpi.completed} accent="text-emerald-600" href={tasksHref('status=completato')} />
            </div>
          ),
          tasks: (
            <HomeDeadlineList
              key="tasks"
              title={scope === 'mine' ? 'I miei task in scadenza' : scope === 'team' ? 'Task del team in scadenza' : 'Task di tutti in scadenza'}
              firstColLabel="Task"
              subColLabel="Cliente"
              emptyText="Nessun task in scadenza."
              rows={data.upcomingTasks.map((t) => ({
                id: t.id,
                href: `/tasks/${t.id}`,
                title: t.title,
                sub: t.clientName,
                subHref: t.clientId ? `/clients/${t.clientId}` : null,
                ownerId: t.ownerId,
                ownerName: t.ownerName,
                endDate: t.endDate,
                status: t.status,
                overdue: t.overdue
              }))}
            />
          ),
          subtasks: (
            <HomeDeadlineList
              key="subtasks"
              anchorId="subtask-deadlines"
              title={scope === 'mine' ? 'I miei sub-task in scadenza' : scope === 'team' ? 'Sub-task del team in scadenza' : 'Sub-task di tutti in scadenza'}
              firstColLabel="Sub-task"
              subColLabel="Task"
              emptyText="Nessun sub-task in scadenza."
              rows={data.upcomingSubtasks.map((s) => ({
                id: s.id,
                href: `/subtasks/${s.id}`,
                title: s.title,
                sub: [s.clientName, s.taskTitle].filter(Boolean).join(' · '),
                subHref: `/tasks/${s.taskId}`,
                ownerId: s.ownerId,
                ownerName: s.ownerName,
                endDate: s.endDate,
                status: s.status,
                recurrence: s.recurrence,
                overdue: s.overdue
              }))}
            />
          )
        }
        // Blocchi consecutivi dello stesso gruppo si affiancano (calendario+KPI, task+sub-task).
        const shown = order.filter((id) => !hidden.has(id))
        const rows: string[][] = []
        for (const id of shown) {
          const g = BLOCKS.find((b) => b.id === id)!.group
          const last = rows[rows.length - 1]
          if (last && BLOCKS.find((b) => b.id === last[0])!.group === g) last.push(id)
          else rows.push([id])
        }
        if (rows.length === 0) {
          return <p className="text-slate-400 text-sm">Nessun blocco visibile: usa &quot;Personalizza&quot; per mostrarli.</p>
        }
        return (
          <>
            {rows.map((ids) => {
              const group = BLOCKS.find((b) => b.id === ids[0])!.group
              const pair = ids.length === 2
              if (group === 'top') {
                return (
                  <div
                    key={ids.join('-')}
                    className={clsx(
                      'grid gap-3 mb-4 items-stretch',
                      pair && (ids[0] === 'calendar' ? 'lg:grid-cols-[280px_1fr] xl:grid-cols-2' : 'lg:grid-cols-[1fr_280px] xl:grid-cols-2')
                    )}
                  >
                    {ids.map((id) => blocks[id])}
                  </div>
                )
              }
              return (
                <div key={ids.join('-')} className={clsx('grid gap-3 mb-4 items-start', pair && 'xl:grid-cols-2')}>
                  {ids.map((id) => blocks[id])}
                </div>
              )
            })}
          </>
        )
      })()}
    </div>
  )
}
