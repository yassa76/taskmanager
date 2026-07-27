'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getInitials } from '@/lib/initials'

interface LogEntry {
  id: string
  action: string
  actionLabel: string
  detail: string | null
  userName: string | null
  userId: string | null
  createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  creato: 'bg-emerald-100 text-emerald-700',
  stato: 'bg-amber-100 text-amber-700',
  owner: 'bg-blue-100 text-blue-700',
  eliminato: 'bg-red-100 text-red-700'
}

export default function ActivityLogPanel({
  entityType,
  entityId
}: {
  entityType: 'task' | 'subtask' | 'client'
  entityId: string
}) {
  const [logs, setLogs] = useState<LogEntry[] | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/activity?entityType=${entityType}&entityId=${entityId}`)
      .then((r) => r.json())
      .then(setLogs)
  }, [entityType, entityId])

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-slate-50"
      >
        <h2 className="font-semibold text-slate-800">
          Attività {logs && logs.length > 0 && <span className="text-slate-400 font-normal">({logs.length})</span>}
        </h2>
        <span className="text-slate-400 text-xs">{open ? '▲ Nascondi' : '▼ Mostra'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-50 max-h-80 overflow-y-auto">
          {!logs && <p className="px-5 py-4 text-sm text-slate-400">Caricamento...</p>}
          {logs && logs.length === 0 && (
            <p className="px-5 py-4 text-sm text-slate-400">Nessuna attività registrata.</p>
          )}
          {logs &&
            logs.map((l) => (
              <div key={l.id} className="px-5 py-3 flex items-start gap-3 text-sm">
                {l.userId ? (
                  <Link
                    href={`/owners/${l.userId}`}
                    className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0 hover:bg-brand-100"
                    title={l.userName || ''}
                  >
                    {getInitials(l.userName)}
                  </Link>
                ) : (
                  <span
                    className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-semibold shrink-0"
                    title="Sistema"
                  >
                    —
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[l.action] || 'bg-slate-100 text-slate-600'}`}>
                      {l.actionLabel}
                    </span>
                    <span className="text-xs text-slate-400">
                      {l.userName || 'Sistema'} · {l.createdAt.slice(0, 10)} {l.createdAt.slice(11, 16)}
                    </span>
                  </div>
                  {l.detail && <p className="text-slate-600 mt-1">{l.detail}</p>}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
