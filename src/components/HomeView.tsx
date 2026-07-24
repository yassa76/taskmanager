'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import Breadcrumbs from './Breadcrumbs'
import DeadlineCalendar, { CalendarItem } from './DeadlineCalendar'

interface UpcomingTask {
  id: string
  title: string
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
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-full hover:border-brand-300 hover:shadow-md transition">
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

function daysLeftLabel(endDate: string | null, overdue: boolean) {
  if (!endDate) return '—'
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (overdue) return `In ritardo di ${Math.abs(diff)} gg`
  if (diff === 0) return 'Scade oggi'
  if (diff === 1) return 'Scade domani'
  return `Tra ${diff} gg`
}

function getInitials(name?: string) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function HomeView({ userName }: { userName: string }) {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<'mine' | 'team'>('mine')
  const [taskPage, setTaskPage] = useState(1)
  const [subtaskPage, setSubtaskPage] = useState(1)
  const PAGE_SIZE = 10

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/home?scope=${scope}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [scope])

  // Ripristina la preferenza "i miei / tutto il team" salvata in precedenza,
  // cosi' resta valida anche navigando su altre pagine e tornando qui.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('homeScope') : null
    if (saved === 'team' || saved === 'mine') setScope(saved)
  }, [])

  function changeScope(v: 'mine' | 'team') {
    setScope(v)
    if (typeof window !== 'undefined') localStorage.setItem('homeScope', v)
  }

  useEffect(() => {
    load()
    setTaskPage(1)
    setSubtaskPage(1)
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
            onClick={load}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ↻ Aggiorna
          </button>
        </div>
      </div>

      {loading && <p className="text-slate-400">Caricamento...</p>}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <KpiCard label={scope === 'mine' ? 'I miei task' : 'Task del team'} value={data.kpi.totalTasks} href={tasksHref('')} />
            <KpiCard
              label="In corso"
              value={data.kpi.inProgress}
              accent="text-amber-600"
              href={tasksHref('status=in_corso')}
            />
            <KpiCard
              label="Da avviare"
              value={data.kpi.notStarted}
              href={tasksHref('status=da_avviare')}
            />
            <KpiCard
              label="Task in ritardo"
              value={data.kpi.overdueTasks}
              accent="text-red-600"
              href={tasksHref('overdue=true')}
            />
            <KpiCard
              label="Sub-task in ritardo"
              value={data.kpi.overdueSubtasks}
              accent="text-red-600"
              href="#subtask-deadlines"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-1">
              <DeadlineCalendar items={data.calendarItems} />
            </div>
            <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-800">
                    {scope === 'mine' ? 'I miei task in scadenza' : 'Task del team in scadenza'}
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Task</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Owner</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Scadenza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingTasks.slice((taskPage - 1) * PAGE_SIZE, taskPage * PAGE_SIZE).map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 max-w-[160px]">
                          <Link
                            href={`/tasks/${t.id}`}
                            className="block truncate text-brand-600 font-medium hover:underline"
                            title={t.title}
                          >
                            {t.title}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-slate-500">{t.clientName || '—'}</td>
                        <td className="px-4 py-2 text-slate-500">
                          {t.ownerId ? (
                            <Link href={`/owners/${t.ownerId}`} className="hover:underline" title={t.ownerName}>
                              {getInitials(t.ownerName)}
                            </Link>
                          ) : (
                            <span title={t.ownerName}>{getInitials(t.ownerName)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className={clsx('text-xs font-medium', t.overdue ? 'text-red-600' : 'text-slate-600')}>
                            {daysLeftLabel(t.endDate, t.overdue)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.upcomingTasks.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400">
                          Nessun task in scadenza. 🎉
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {data.upcomingTasks.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>
                      Pagina {taskPage} di {Math.ceil(data.upcomingTasks.length / PAGE_SIZE)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                        disabled={taskPage === 1}
                        className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
                      >
                        ←
                      </button>
                      <button
                        onClick={() =>
                          setTaskPage((p) => Math.min(Math.ceil(data.upcomingTasks.length / PAGE_SIZE), p + 1))
                        }
                        disabled={taskPage === Math.ceil(data.upcomingTasks.length / PAGE_SIZE)}
                        className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div id="subtask-deadlines" className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm scroll-mt-20">
                <div className="px-5 py-3 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-800">
                    {scope === 'mine' ? 'I miei sub-task in scadenza' : 'Sub-task del team in scadenza'}
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Sub-task</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Task</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Owner</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Scadenza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingSubtasks.slice((subtaskPage - 1) * PAGE_SIZE, subtaskPage * PAGE_SIZE).map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 max-w-[160px]">
                          <Link
                            href={`/subtasks/${s.id}`}
                            className="block truncate text-brand-600 font-medium hover:underline"
                            title={s.title}
                          >
                            {s.title}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-slate-500 max-w-[140px] truncate" title={s.taskTitle}>
                          {s.taskTitle}
                        </td>
                        <td className="px-4 py-2 text-slate-500">
                          {s.ownerId ? (
                            <Link href={`/owners/${s.ownerId}`} className="hover:underline" title={s.ownerName}>
                              {getInitials(s.ownerName)}
                            </Link>
                          ) : (
                            <span title={s.ownerName}>{getInitials(s.ownerName)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className={clsx('text-xs font-medium', s.overdue ? 'text-red-600' : 'text-slate-600')}>
                            {daysLeftLabel(s.endDate, s.overdue)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.upcomingSubtasks.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400">
                          Nessun sub-task in scadenza. 🎉
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {data.upcomingSubtasks.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>
                      Pagina {subtaskPage} di {Math.ceil(data.upcomingSubtasks.length / PAGE_SIZE)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSubtaskPage((p) => Math.max(1, p - 1))}
                        disabled={subtaskPage === 1}
                        className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
                      >
                        ←
                      </button>
                      <button
                        onClick={() =>
                          setSubtaskPage((p) => Math.min(Math.ceil(data.upcomingSubtasks.length / PAGE_SIZE), p + 1))
                        }
                        disabled={subtaskPage === Math.ceil(data.upcomingSubtasks.length / PAGE_SIZE)}
                        className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
