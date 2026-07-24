'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'

export interface CalendarItem {
  id: string
  type: 'task' | 'subtask'
  title: string
  date: string // YYYY-MM-DD
  clientName?: string | null
  ownerId?: string
  ownerName?: string
}

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
]
const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function getInitials(name?: string | null) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function DeadlineCalendar({ items }: { items: CalendarItem[] }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-11
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of items) {
      const list = map.get(item.date) || []
      list.push(item)
      map.set(item.date, list)
    }
    return map
  }, [items])

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    // getDay(): 0=Sunday..6=Saturday. Convert so Monday=0..Sunday=6.
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const result: { day: number | null; key: string | null }[] = []
    for (let i = 0; i < firstWeekday; i++) result.push({ day: null, key: null })
    for (let d = 1; d <= daysInMonth; d++) result.push({ day: d, key: toDateKey(viewYear, viewMonth, d) })
    while (result.length % 7 !== 0) result.push({ day: null, key: null })
    return result
  }, [viewYear, viewMonth])

  function prevMonth() {
    setSelectedDate(null)
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    setSelectedDate(null)
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const selectedItems = selectedDate ? itemsByDate.get(selectedDate) || [] : []

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center"
        >
          ←
        </button>
        <h2 className="font-semibold text-slate-800">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES.map((w) => (
          <div key={w} className="text-xs font-semibold text-slate-400 uppercase py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (cell.day === null) return <div key={i} />
          const dayItems = cell.key ? itemsByDate.get(cell.key) || [] : []
          const isToday = cell.key === todayKey
          const isSelected = cell.key === selectedDate
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(cell.key === selectedDate ? null : cell.key)}
              className={clsx(
                'aspect-square rounded-lg text-sm flex flex-col items-center justify-center relative transition',
                isSelected
                  ? 'bg-brand-600 text-white'
                  : isToday
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'hover:bg-slate-100 text-slate-700'
              )}
            >
              <span>{cell.day}</span>
              {dayItems.length > 0 && (
                <span
                  className={clsx(
                    'absolute bottom-1 w-1.5 h-1.5 rounded-full',
                    isSelected ? 'bg-white' : 'bg-red-500'
                  )}
                />
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
            Scadenze del {selectedDate.slice(8, 10)}/{selectedDate.slice(5, 7)}/{selectedDate.slice(0, 4)}
          </p>
          {selectedItems.length === 0 && (
            <p className="text-sm text-slate-400">Nessuna scadenza in questo giorno.</p>
          )}
          <div className="space-y-1">
            {selectedItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm"
              >
                <Link
                  href={item.type === 'task' ? `/tasks/${item.id}` : `/subtasks/${item.id}`}
                  className="flex-1 flex items-center gap-2 min-w-0"
                >
                  <span className="text-xs text-slate-400 shrink-0 max-w-[30%] truncate" title={item.clientName || ''}>
                    {item.clientName || '—'}
                  </span>
                  <span className="flex-1 text-brand-600 font-medium truncate min-w-0" title={item.title}>
                    {item.type === 'subtask' ? '↳ ' : ''}
                    {item.title}
                  </span>
                </Link>
                {item.ownerId ? (
                  <Link
                    href={`/owners/${item.ownerId}`}
                    className="text-xs text-slate-400 shrink-0 font-medium hover:underline hover:text-brand-600"
                    title={item.ownerName || ''}
                  >
                    {getInitials(item.ownerName)}
                  </Link>
                ) : (
                  <span className="text-xs text-slate-400 shrink-0 font-medium" title={item.ownerName || ''}>
                    {getInitials(item.ownerName)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
