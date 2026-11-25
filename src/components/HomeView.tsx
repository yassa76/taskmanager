'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import Breadcrumbs from './Breadcrumbs'
import DeadlineCalendar, { CalendarItem } from './DeadlineCalendar'
import HomeDeadlineList from './HomeDeadlineList'

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
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<'mine' | 'team'>('mine')

  // La preferenza salvata va letta PRIMA del primo caricamento: altrimenti parte la richiesta
  // "mine" e la sua risposta puo' arrivare dopo quella "team", mostrando numeri sbagliati.
  const [ready, setReady] = useState(false)

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

  // Ripristina la preferenza "i miei / tutto il team" salvata in precedenza,
  // cosi' resta valida anche navigando su altre pagine e tornando qui.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('homeScope') : null
    if (saved === 'team' || saved === 'mine') setScope(saved)
    setReady(true)
  }, [])

  function changeScope(v: 'mine' | 'team') {
    setScope(v)
    if (typeof window !== 'undefined') localStorage.setItem('homeScope', v)
  }

  useEffect(() => {
    return load()
  }, [load])

  // Costruisce il link verso la vista Task con i filtri giusti a seconda
  // di dove si e' cliccato e se si sta guardando "i miei" o "tutto il team".
  function tasksHref(extra: string) {
    const params = new URLSearchParams(extra)
    if (scope === 'mine') params.set('view', 'mine')
    return `/tasks?${params.toString()}`
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Home' }]} />
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-800">Ciao, {userName.split(' ')[0] || userName} 👋</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex bg-slate-100 rounded-lg p-1">
              {(['mine', 'team'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => changeScope(v)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition',
                    scope === v ? 'bg-white shadow text-brand-700' : 'text-slate-500'
                  )}
                >
                  {v === 'mine' ? 'I miei record' : 'Tutto il team'}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              load()
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ↻ Aggiorna
          </button>
        </div>
      </div>

      {loading && <p className="text-slate-400">Caricamento...</p>}

      {!loading && data && (
        <>
          <div className="grid lg:grid-cols-[280px_1fr] gap-3 mb-4 items-stretch">
            <div className="lg:h-[200px]">
              <DeadlineCalendar items={data.calendarItems} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 auto-rows-fr gap-2 lg:h-[200px]">
              <KpiCard label={scope === 'mine' ? 'I miei task attivi' : 'Task attivi del team'} value={data.kpi.totalTasks} href={tasksHref('')} />
              <KpiCard label="In corso" value={data.kpi.inProgress} accent="text-amber-600" href={tasksHref('status=in_corso')} />
              <KpiCard label="Da avviare" value={data.kpi.notStarted} href={tasksHref('status=da_avviare')} />
              <KpiCard label="Task in ritardo" value={data.kpi.overdueTasks} accent="text-red-600" href={tasksHref('overdue=true')} />
              <KpiCard label="Sub-task in ritardo" value={data.kpi.overdueSubtasks} accent="text-red-600" href="#subtask-deadlines" />
              <KpiCard label="Completati" value={data.kpi.completed} accent="text-emerald-600" href={tasksHref('status=completato')} />
            </div>
          </div>

          <div className="grid xl:grid-cols-2 gap-6 mb-6 items-start">
              <HomeDeadlineList
                title={scope === 'mine' ? 'I miei task in scadenza' : 'Task del team in scadenza'}
                firstColLabel="Task"
                subColLabel="Cliente"
                emptyText="Nessun task in scadenza. 🎉"
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
              <HomeDeadlineList
                anchorId="subtask-deadlines"
                title={scope === 'mine' ? 'I miei sub-task in scadenza' : 'Sub-task del team in scadenza'}
                firstColLabel="Sub-task"
                subColLabel="Task"
                emptyText="Nessun sub-task in scadenza. 🎉"
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
          </div>
        </>
      )}
    </div>
  )
}
