'use client'

import clsx from 'clsx'

export interface NotificationItem {
  id: string
  reason: string
  read: boolean
  createdAt: string
  authorName: string | null
  entityType: 'task' | 'subtask' | 'team'
  entityId: string
  entityTitle: string | null
  snippet: string | null
  message: string | null
}

const ICONS: Record<string, string> = { richiesta_accesso: '🔑', menzione: '💬', assegnato: '👤', scadenza_cambiata: '📅', in_scadenza: '⏰' }

export function whenLabel(iso: string) {
  return new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
}

export function notificationHref(i: NotificationItem) {
  if (i.entityType === 'team') return '/team'
  const base = `/${i.entityType === 'task' ? 'tasks' : 'subtasks'}/${i.entityId}`
  return i.reason === 'menzione' ? `${base}#commenti` : base
}

// Riga di un avviso. Le menzioni hanno una barra colorata a sinistra e un fondo piu' marcato: sono la priorita'.
export default function NotificationRow({ item, onClick }: { item: NotificationItem; onClick: () => void }) {
  const mention = item.reason === 'menzione'
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50 text-sm border-l-4',
        mention ? 'border-l-brand-600' : 'border-l-transparent',
        !item.read && (mention ? 'bg-brand-50' : 'bg-slate-50')
      )}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-base leading-5" aria-hidden>
          {ICONS[item.reason] ?? '🔔'}
        </span>
        <div className="min-w-0 flex-1">
          {mention ? (
            <>
              <p className="text-slate-700">
                <span className="font-semibold">{item.authorName}</span> ti ha menzionato nel{' '}
                {item.entityType === 'task' ? 'task' : 'sub-task'}{' '}
                <span className="font-medium">«{item.entityTitle ?? 'eliminato'}»</span>
              </p>
              {item.snippet && <p className="text-xs text-slate-500 truncate">{item.snippet}</p>}
            </>
          ) : (
            <p className="text-slate-600">{item.message ?? 'Aggiornamento'}</p>
          )}
          <p className="text-[11px] text-slate-400 mt-0.5">{whenLabel(item.createdAt)}</p>
        </div>
        {!item.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-600 shrink-0" />}
      </div>
    </button>
  )
}
