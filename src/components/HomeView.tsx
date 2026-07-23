'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import Breadcrumbs from './Breadcrumbs'

interface UpcomingTask {
  id: string
  title: string
  clientName: string | null
  endDate: string | null
  status: 'da_avviare' | 'in_corso' | 'completato'
  overdue: boolean
}

interface UpcomingSubtask {
  id: string
  title: string
  taskId: string
  taskTitle: string
  clientName: string | null
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
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={clsx('text-2xl font-bold mt-1', accent || 'text-slate-800')}>{value}</p>
    </div>
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

export default function HomeView({ userName }: { userName: string }) {
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/home')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Home' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Ciao, {userName.split(' ')[0] || userName} 👋</h1>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ↻ Aggiorna
        </button>
      </div>

      {loading && <p className="text-slate-400">Caricamento...</p>}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <KpiCard label="I miei task" value={data.kpi.totalTasks} />
            <KpiCard label="In corso" value={data.kpi.inProgress} accent="text-amber-600" />
            <KpiCard label="Da avviare" value={data.kpi.notStarted} />
            <KpiCard label="Task in ritardo" value={data.kpi.overdueTasks} accent="text-red-600" />
            <KpiCard label="Sub-task in ritardo" value={data.kpi.overdueSubtasks} accent="text-red-600" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">I miei task in scadenza</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Task</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Scadenza</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcomingTasks.map((t) => (
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
                      <td className="px-4 py-2">
                        <span className={clsx('text-xs font-medium', t.overdue ? 'text-red-600' : 'text-slate-600')}>
                          {daysLeftLabel(t.endDate, t.overdue)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.upcomingTasks.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-slate-400">
                        Nessun task in scadenza. 🎉
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">I miei sub-task in scadenza</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Sub-task</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Task</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Scadenza</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcomingSubtasks.map((s) => (
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
                      <td className="px-4 py-2">
                        <span className={clsx('text-xs font-medium', s.overdue ? 'text-red-600' : 'text-slate-600')}>
                          {daysLeftLabel(s.endDate, s.overdue)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.upcomingSubtasks.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-slate-400">
                        Nessun sub-task in scadenza. 🎉
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
