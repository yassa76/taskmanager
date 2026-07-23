'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import Breadcrumbs from './Breadcrumbs'

interface ReportData {
  kpi: {
    totalTasks: number
    completed: number
    inProgress: number
    notStarted: number
    cancelled: number
    overdue: number
    completionRate: number
    totalSubtasks: number
    completedSubtasks: number
    subtaskCompletionRate: number
  }
  byOwner: { name: string; total: number; completati: number }[]
  byClient: { name: string; total: number }[]
  statusDistribution: { name: string; value: number }[]
}

const COLORS = ['#94a3b8', '#f59e0b', '#10b981', '#64748b']

function KpiCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-slate-800'}`}>{value}</p>
    </div>
  )
}

export default function ReportsView() {
  const [data, setData] = useState<ReportData | null>(null)

  const load = useCallback(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then(setData)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) return <p className="text-slate-400">Caricamento report...</p>

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Report & KPI' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Report & KPI</h1>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ↻ Aggiorna
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Task totali" value={data.kpi.totalTasks} />
        <KpiCard label="% completamento" value={`${data.kpi.completionRate}%`} accent="text-emerald-600" />
        <KpiCard label="In corso" value={data.kpi.inProgress} accent="text-amber-600" />
        <KpiCard label="In ritardo" value={data.kpi.overdue} accent="text-red-600" />
        <KpiCard label="Da avviare" value={data.kpi.notStarted} />
        <KpiCard label="Completati" value={data.kpi.completed} accent="text-emerald-600" />
        <KpiCard label="Sub-task totali" value={data.kpi.totalSubtasks} />
        <KpiCard label="% sub-task completati" value={`${data.kpi.subtaskCompletionRate}%`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">Distribuzione stati task</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.statusDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {data.statusDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">Task per owner</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.byOwner}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" name="Totali" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completati" name="Completati" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">Task per cliente</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.byClient}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" name="Task" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
