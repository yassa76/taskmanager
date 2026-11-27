'use client'

import { CheckboxIcon, WarningIcon} from './icons'
import { filterSelectClass } from '@/lib/ui'
import clsx from 'clsx'
import type { ClientDTO } from '@/types'
import Combobox from './Combobox'
import type { ViewScope } from '@/lib/scopesShared'

export interface FilterState {
  view: ViewScope
  clientId: string
  ownerId: string
  status: string
  search: string
  overdue: boolean
  includeClosed: boolean
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
      <Combobox
        value={filters.clientId}
        onChange={(id) => onChange({ ...filters, clientId: id })}
        options={clients.map((c) => ({ id: c.id, label: c.name }))}
        emptyLabel="Tutti i clienti"
        placeholder="Cerca cliente..."
        className="w-full sm:w-48"
      />

      <Combobox
        value={filters.ownerId}
        onChange={(id) => onChange({ ...filters, ownerId: id })}
        options={owners.map((o) => ({ id: o.id, label: o.name }))}
        emptyLabel="Tutti gli owner"
        placeholder="Cerca owner..."
        className="w-full sm:w-48"
      />

      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className={filterSelectClass(filters.status)}
      >
        <option value="">Tutti gli stati</option>
        <option value="da_avviare">Da avviare</option>
        <option value="in_corso">In corso</option>
        <option value="completato">Completato</option>
        <option value="annullato">Annullato</option>
      </select>

      <button
        onClick={() => onChange({ ...filters, overdue: !filters.overdue })}
        className={clsx(
          'px-3 h-9 rounded-lg text-sm font-medium border transition',
          filters.overdue
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
        )}
      >
        <WarningIcon /> In ritardo
      </button>

      <button
        onClick={() => onChange({ ...filters, includeClosed: !filters.includeClosed })}
        title="Per default i task completati e annullati sono nascosti"
        className={clsx(
          'px-3 h-9 rounded-lg text-sm font-medium border transition',
          filters.includeClosed
            ? 'bg-slate-100 border-slate-300 text-slate-700'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
        )}
      >
        <CheckboxIcon checked={filters.includeClosed} /> Mostra completati/annullati
      </button>

      <input
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="Cerca per titolo o descrizione..."
        className="border border-slate-200 rounded-lg px-3 h-9 text-sm flex-1 min-w-[180px]"
      />
    </div>
  )
}
