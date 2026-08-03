'use client'

import { useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import type { TaskDTO } from '@/types'
import { getInitials } from '@/lib/initials'

type ColumnStatus = 'da_avviare' | 'in_corso' | 'completato' | 'annullato'

const COLUMNS: { status: ColumnStatus; label: string; accent: string }[] = [
  { status: 'da_avviare', label: 'Da avviare', accent: 'border-t-gray-400' },
  { status: 'in_corso', label: 'In corso', accent: 'border-t-amber-400' },
  { status: 'completato', label: 'Completato', accent: 'border-t-emerald-400' },
  { status: 'annullato', label: 'Annullato', accent: 'border-t-slate-400' }
]

export default function TasksKanban({
  tasks,
  showCancelled,
  onStatusChange
}: {
  tasks: TaskDTO[]
  showCancelled: boolean
  onStatusChange: (taskId: string, newStatus: ColumnStatus) => void
}) {
  const [dragOverCol, setDragOverCol] = useState<ColumnStatus | null>(null)

  const columns = showCancelled ? COLUMNS : COLUMNS.filter((c) => c.status !== 'annullato')

  function handleDrop(e: React.DragEvent, status: ColumnStatus) {
    e.preventDefault()
    setDragOverCol(null)
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) onStatusChange(taskId, status)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status)
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverCol(col.status)
            }}
            onDragLeave={() => setDragOverCol((c) => (c === col.status ? null : c))}
            onDrop={(e) => handleDrop(e, col.status)}
            className={clsx(
              'flex-1 min-w-[240px] bg-slate-50 border border-slate-200 border-t-4 rounded-xl p-3',
              col.accent,
              dragOverCol === col.status && 'ring-2 ring-brand-400 bg-brand-50/40'
            )}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-semibold text-slate-700 text-sm">{col.label}</h3>
              <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                {colTasks.length}
              </span>
            </div>

            <div className="space-y-2 min-h-[80px]">
              {colTasks.map((t) => {
                const overdue =
                  t.endDate && new Date(t.endDate) < new Date() && t.status !== 'completato' && t.status !== 'annullato'
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', t.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-brand-300 hover:shadow-md transition"
                  >
                    <Link
                      href={`/tasks/${t.id}`}
                      className="block text-sm font-medium text-brand-700 hover:underline truncate"
                      title={t.title}
                    >
                      {t.title}
                    </Link>
                    {t.clientName && (
                      <p className="text-xs text-slate-400 truncate mt-0.5" title={t.clientName}>
                        {t.clientName}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={clsx('text-xs', overdue ? 'text-red-600 font-semibold' : 'text-slate-400')}
                        title={t.endDate ? t.endDate.slice(0, 10) : undefined}
                      >
                        {t.endDate ? t.endDate.slice(0, 10) : '—'}
                      </span>
                      <Link
                        href={`/owners/${t.owner.id}`}
                        className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[10px] font-semibold shrink-0 hover:bg-brand-100"
                        title={t.owner.name || t.owner.email}
                      >
                        {getInitials(t.owner.name)}
                      </Link>
                    </div>
                  </div>
                )
              })}
              {colTasks.length === 0 && (
                <p className="text-xs text-slate-300 text-center py-6">Nessun task</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
