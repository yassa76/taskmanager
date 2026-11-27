'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
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
  byOwner: {
    id: string
    name: string
    total: number
    da_avviare: number
    in_corso: number
    completato: number
    annullato: number
  }[]
  byOwnerStatus: {
    id: string
    name: string
    da_avviare: number
    in_corso: number
    completato: number
    annullato: number
  }[]
  byClient: {
    id: string | null
    name: string
    total: number
    da_avviare: number
    in_corso: number
    completato: number
    annullato: number
  }[]
  byClientTruncated: boolean
  statusDistribution: { name: string; status: string; value: number }[]
}

const COLORS = ['#94a3b8', '#f59e0b', '#10b981', '#64748b']

const PERIOD_OPTIONS: { value: string; label: string; days: number | null }[] = [
  { value: 'all', label: 'Tutto il periodo', days: null },
  { value: '7', label: 'Ultimi 7 giorni', days: 7 },
  { value: '30', label: 'Ultimi 30 giorni', days: 30 },
  { value: '90', label: 'Ultimi 90 giorni', days: 90 },
  { value: '365', label: 'Ultimo anno', days: 365 }
]

function KpiCard({ label, value, accent, href }: { label: string; value: string | number; accent?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-slate-800'}`}>{value}</p>
    </>
  )
  const base = 'bg-white border border-slate-200 rounded-xl p-4 shadow-sm'
  if (!href) return <div className={base}>{body}</div>
  return (
    <Link href={href} className={`${base} block hover:border-brand-400 hover:shadow transition`}>
      {body}
    </Link>
  )
}

function ownerInitials(name?: string) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Etichetta asse X: solo iniziali, nome completo al passaggio del mouse
function OwnerTick(props: any) {
  const { x, y, payload } = props
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#666" fontSize={11} style={{ cursor: 'default' }}>
        <title>{payload?.value}</title>
        {ownerInitials(payload?.value)}
      </text>
    </g>
  )
}

export default function ReportsView() {
  const router = useRouter()
  const { data: session } = useSession()
  // l'interruttore "I miei / Tutto il team" compare a chi, per profilo e ruolo, vede anche i record di altri
  const isAdmin = !!(session?.user as any)?.canSeeTeam

  const [data, setData] = useState<ReportData | null>(null)
  const [scope, setScope] = useState<'mine' | 'team'>('mine')
  const [period, setPeriod] = useState('all')
  const [includeClosed, setIncludeClosed] = useState(false)
  // I filtri salvati vanno letti PRIMA del primo caricamento, altrimenti parte una richiesta con
  // i valori di default e la sua risposta puo' sovrascrivere quella giusta.
  const [ready, setReady] = useState(false)

  // Ripristina i filtri salvati in precedenza, cosi' restano validi anche
  // navigando su altre pagine e tornando qui (stesso meccanismo della Home).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedScope = localStorage.getItem('reportsScope')
    if (savedScope === 'team' || savedScope === 'mine') setScope(savedScope)
    const savedPeriod = localStorage.getItem('reportsPeriod')
    if (savedPeriod && PERIOD_OPTIONS.some((p) => p.value === savedPeriod)) setPeriod(savedPeriod)
    const savedIncludeClosed = localStorage.getItem('reportsIncludeClosed')
    if (savedIncludeClosed === 'true') setIncludeClosed(true)
    setReady(true)
  }, [])

  function changeScope(v: 'mine' | 'team') {
    setScope(v)
    if (typeof window !== 'undefined') localStorage.setItem('reportsScope', v)
  }

  function changePeriod(v: string) {
    setPeriod(v)
    if (typeof window !== 'undefined') localStorage.setItem('reportsPeriod', v)
  }

  function changeIncludeClosed(v: boolean) {
    setIncludeClosed(v)
    if (typeof window !== 'undefined') localStorage.setItem('reportsIncludeClosed', String(v))
  }

  const load = useCallback(() => {
    if (!ready) return
    let stale = false
    const params = new URLSearchParams()
    params.set('scope', scope)
    if (includeClosed) params.set('includeClosed', 'true')
    const opt = PERIOD_OPTIONS.find((p) => p.value === period)
    if (opt?.days) {
      const since = new Date()
      since.setDate(since.getDate() - opt.days)
      params.set('since', since.toISOString())
    }
    fetch(`/api/reports?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!stale) setData(d)
      })
    return () => {
      stale = true
    }
  }, [scope, period, includeClosed, ready])

  useEffect(() => {
    return load()
  }, [load])

  // Link alla lista task filtrata. Nota: il periodo scelto qui sopra non viene trasportato
  // nella lista, che mostra i task per stato senza limite di date.
  function tasksHref(extra: string) {
    const params = new URLSearchParams(extra)
    if (scope === 'mine') params.set('view', 'mine')
    return `/tasks?${params.toString()}`
  }

  function openClient(d: any) {
    if (d?.id) router.push(`/clients/${d.id}`)
  }

  if (!data) return <p className="text-slate-400">Caricamento report...</p>

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Report & KPI' }]} />
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-800">Report & KPI</h1>
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
                  {v === 'mine' ? 'I miei dati' : 'Tutto il team'}
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

      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2 mb-6">
        <select
          value={period}
          onChange={(e) => changePeriod(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">(filtra in base alla data di creazione)</span>
        <button
          onClick={() => changeIncludeClosed(!includeClosed)}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium border transition ml-auto',
            includeClosed
              ? 'bg-slate-100 border-slate-300 text-slate-700'
              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
          )}
        >
          {includeClosed ? '☑' : '☐'} Mostra completati/annullati nei grafici
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Task totali (tutti gli stati)" value={data.kpi.totalTasks} href={tasksHref('closed=true')} />
        <KpiCard label="Task attivi" value={data.kpi.inProgress + data.kpi.notStarted} href={tasksHref('')} />
        <KpiCard label="% completamento" value={`${data.kpi.completionRate}%`} accent="text-emerald-600" />
        <KpiCard label="In corso" value={data.kpi.inProgress} accent="text-amber-600" href={tasksHref('status=in_corso')} />
        <KpiCard label="In ritardo" value={data.kpi.overdue} accent="text-red-600" href={tasksHref('overdue=true')} />
        <KpiCard label="Da avviare" value={data.kpi.notStarted} href={tasksHref('status=da_avviare')} />
        <KpiCard label="Completati" value={data.kpi.completed} accent="text-emerald-600" href={tasksHref('status=completato')} />
        <KpiCard label="Annullati" value={data.kpi.cancelled} accent="text-slate-500" href={tasksHref('status=annullato')} />
        <KpiCard label="Sub-task totali" value={data.kpi.totalSubtasks} />
        <KpiCard label="% sub-task completati" value={`${data.kpi.subtaskCompletionRate}%`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">
            Distribuzione stati task <span className="font-normal text-slate-400">(clicca una fetta per la lista)</span>
          </h2>
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
                cursor="pointer"
                onClick={(d: any) => {
                  const status = d?.status ?? d?.payload?.status
                  if (status) router.push(tasksHref(`status=${status}`))
                }}
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
          <h2 className="text-sm font-semibold text-slate-600 mb-4">
            Task per owner{' '}
            <span className="font-normal text-slate-400">(per stato — clicca una barra per il dettaglio)</span>
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.byOwner}>
              <XAxis dataKey="name" tick={<OwnerTick />} interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="da_avviare"
                name="Da avviare"
                stackId="owner"
                fill="#94a3b8"
                cursor="pointer"
                onClick={(d: any) => d?.id && router.push(`/owners/${d.id}`)}
              />
              <Bar
                dataKey="in_corso"
                name="In corso"
                stackId="owner"
                fill="#f59e0b"
                cursor="pointer"
                onClick={(d: any) => d?.id && router.push(`/owners/${d.id}`)}
              />
              {includeClosed && (
                <Bar
                  dataKey="completato"
                  name="Completato"
                  stackId="owner"
                  fill="#10b981"
                  cursor="pointer"
                  onClick={(d: any) => d?.id && router.push(`/owners/${d.id}`)}
                />
              )}
              {includeClosed && (
                <Bar
                  dataKey="annullato"
                  name="Annullato"
                  stackId="owner"
                  fill="#64748b"
                  cursor="pointer"
                  onClick={(d: any) => d?.id && router.push(`/owners/${d.id}`)}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">
            Carico di lavoro per persona{' '}
            <span className="font-normal text-slate-400">
              (task + sub-task per stato — clicca una barra per il dettaglio)
            </span>
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byOwnerStatus}>
              <XAxis dataKey="name" tick={<OwnerTick />} interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="da_avviare"
                name="Da avviare"
                stackId="workload"
                fill="#94a3b8"
                cursor="pointer"
                onClick={(d: any) => d?.id && router.push(`/owners/${d.id}`)}
              />
              <Bar
                dataKey="in_corso"
                name="In corso"
                stackId="workload"
                fill="#f59e0b"
                cursor="pointer"
                onClick={(d: any) => d?.id && router.push(`/owners/${d.id}`)}
              />
              {includeClosed && (
                <Bar
                  dataKey="completato"
                  name="Completato"
                  stackId="workload"
                  fill="#10b981"
                  cursor="pointer"
                  onClick={(d: any) => d?.id && router.push(`/owners/${d.id}`)}
                />
              )}
              {includeClosed && (
                <Bar
                  dataKey="annullato"
                  name="Annullato"
                  stackId="workload"
                  fill="#64748b"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(d: any) => d?.id && router.push(`/owners/${d.id}`)}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">
            Task per cliente{' '}
            <span className="font-normal text-slate-400">
              (per stato{data.byClientTruncated ? ', top 10 per numero di task' : ''} — clicca una barra per il cliente)
            </span>
          </h2>
          <ResponsiveContainer width="100%" height={Math.max(260, data.byClient.length * 36)}>
            <BarChart data={data.byClient} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="da_avviare" name="Da avviare" stackId="client" fill="#94a3b8" cursor="pointer" onClick={openClient} />
              <Bar dataKey="in_corso" name="In corso" stackId="client" fill="#f59e0b" cursor="pointer" onClick={openClient} />
              {includeClosed && (
                <Bar dataKey="completato" name="Completato" stackId="client" fill="#10b981" cursor="pointer" onClick={openClient} />
              )}
              {includeClosed && (
                <Bar dataKey="annullato" name="Annullato" stackId="client" fill="#64748b" cursor="pointer" onClick={openClient} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
