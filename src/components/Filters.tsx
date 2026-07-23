'use client'

import clsx from 'clsx'
import type { ClientDTO } from '@/types'

export interface FilterState {
  view: 'all' | 'mine'
  clientId: string
  ownerId: string
  status: string
  search: string
  overdue: boolean
}

export default function Filters({
  filters,
  onChange,
  clients,
  owners
}: {
  filters: FilterState
  onChange: (f: FilterState) => void
  clients: ClientDTO[]
  owners: { id: string; name: string; email: string }[]
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
      <div className="flex bg-slate-100 rounded-lg p-1">
        {(['all', 'mine'] as const).map((v) => (
          <button
            key={v}
            onClick={() => onChange({ ...filters, view: v })}
            className={clsx(
              'px-3 py-1.5 rounded-md text-sm font-medium transition',
              filters.view === v ? 'bg-white shadow text-brand-700' : 'text-slate-500'
            )}
          >
            {v === 'all' ? 'Tutti i task' : 'I miei task'}
          </button>
        ))}
      </div>

      <select
        value={filters.clientId}
        onChange={(e) => onChange({ ...filters, clientId: e.target.value })}
        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
      >
        <option value="">Tutti i clienti</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={filters.ownerId}
        onChange={(e) => onChange({ ...filters, ownerId: e.target.value })}
        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
      >
        <option value="">Tutti gli owner</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
      >
        <option value="">Tutti gli stati</option>
        <option value="da_avviare">Da avviare</option>
        <option value="in_corso">In corso</option>
        <option value="completato">Completato</option>
      </select>

      <button
        onClick={() => onChange({ ...filters, overdue: !filters.overdue })}
        className={clsx(
          'px-3 py-1.5 rounded-lg text-sm font-medium border transition',
          filters.overdue
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
        )}
      >
        ⚠ In ritardo
      </button>

      <input
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="Cerca per titolo o descrizione..."
        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[180px]"
      />
    </div>
  )
}
