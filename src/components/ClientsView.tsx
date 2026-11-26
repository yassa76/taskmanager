'use client'

import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import type { ClientDTO, TeamMemberDTO } from '@/types'
import Breadcrumbs from './Breadcrumbs'
import DataTable, { type Column } from './DataTable'
import { EditIcon, DeleteIcon } from './icons'
import Combobox from './Combobox'
import ClientLocationFields from './ClientLocationFields'
import ClientsMap from './ClientsMap'
import { clientRegion, countryLabel } from '@/lib/geoShared'

const INDUSTRIES = ['GPS', 'TMT', 'ER&I', 'FSI', 'CONS']

type SortKey = 'name' | 'industry' | 'country' | 'region'
type SortDir = 'asc' | 'desc'

interface OwnerLite {
  id: string
  name: string
  email: string
}

interface ClientFormState {
  name: string
  description: string
  industry: string
  status: 'attivo' | 'inattivo'
  ownerId: string
  address: string
  country: string
  province: string
  city: string
}

const emptyForm: ClientFormState = {
  name: '',
  description: '',
  industry: '',
  status: 'attivo',
  ownerId: '',
  address: '',
  country: '',
  province: '',
  city: ''
}

export default function ClientsView() {
  const [clients, setClients] = useState<ClientDTO[]>([])
  const [owners, setOwners] = useState<OwnerLite[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ClientFormState>(emptyForm)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [view, setView] = useState<'table' | 'map'>('table')
  const [statusFilter, setStatusFilter] = useState('')

  // Vista e filtri restano memorizzati navigando su altre pagine e tornando qui
  // (sessione del browser). "Azzera filtri" li riporta a zero.
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    try {
      const v = localStorage.getItem('clientsViewMode')
      if (v === 'table' || v === 'map') setView(v)
      const raw = sessionStorage.getItem('clientsFilters')
      if (raw) {
        const f = JSON.parse(raw)
        setSearch(f.search || '')
        setIndustryFilter(f.industry || '')
        setStatusFilter(f.status || '')
        setCountryFilter(f.country || '')
        setRegionFilter(f.region || '')
        setCityFilter(f.city || '')
      }
    } catch {}
    setRestored(true)
  }, [])
  useEffect(() => {
    if (!restored) return
    try {
      localStorage.setItem('clientsViewMode', view)
      sessionStorage.setItem(
        'clientsFilters',
        JSON.stringify({
          search,
          industry: industryFilter,
          status: statusFilter,
          country: countryFilter,
          region: regionFilter,
          city: cityFilter
        })
      )
    } catch {}
  }, [restored, view, search, industryFilter, statusFilter, countryFilter, regionFilter, cityFilter])

  async function load() {
    setLoading(true)
    const [clientsRes, teamRes] = await Promise.all([fetch('/api/clients'), fetch('/api/team')])
    setClients(await clientsRes.json())
    const team: TeamMemberDTO[] = await teamRes.json()
    setOwners(
      team
        .filter((t) => t.status !== 'inactive' && t.matchedUser)
        .map((t) => ({ id: t.matchedUser!.id, name: t.matchedUser!.name || t.email, email: t.email }))
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // filtri "generici": la mappa conta i clienti su questi, senza filtri geografici
  const baseClients = useMemo(() => {
    return clients
      .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
      .filter((c) => !industryFilter || c.industry === industryFilter)
      .filter((c) => !statusFilter || c.status === statusFilter)
  }, [clients, search, industryFilter, statusFilter])

  const filteredClients = useMemo(() => {
    return baseClients
      .filter((c) => {
        if (!countryFilter) return true
        if (countryFilter === '__none') return !c.country || (c.country === 'IT' && !clientRegion(c))
        return c.country === countryFilter
      })
      .filter((c) => !regionFilter || clientRegion(c) === regionFilter)
      .filter((c) => !cityFilter || c.city === cityFilter)
  }, [baseClients, countryFilter, regionFilter, cityFilter])

  // opzioni dei filtri geografici
  const countryOptions = useMemo(() => {
    const codes = Array.from(new Set(clients.map((c) => c.country).filter(Boolean) as string[]))
    return codes.map((code) => ({ code, label: countryLabel(code) })).sort((a, b) => a.label.localeCompare(b.label))
  }, [clients])
  const regionOptions = useMemo(
    () => Array.from(new Set(clients.map((c) => clientRegion(c)).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [clients]
  )
  const cityOptions = useMemo(() => {
    const set = new Set<string>()
    for (const c of clients) {
      if (!c.city) continue
      if (countryFilter && countryFilter !== '__none' && c.country !== countryFilter) continue
      if (regionFilter && clientRegion(c) !== regionFilter) continue
      set.add(c.city)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [clients, countryFilter, regionFilter])

  // dati per la mappa
  const mapData = useMemo(() => {
    const regionCounts: Record<string, number> = {}
    const abroadMap = new Map<string, number>()
    let noLocation = 0
    for (const c of clients) {
      const reg = clientRegion(c)
      if (reg) regionCounts[reg] = (regionCounts[reg] || 0) + 1
      else if (c.country && c.country !== 'IT') abroadMap.set(c.country, (abroadMap.get(c.country) || 0) + 1)
      else noLocation++
    }
    const abroad = Array.from(abroadMap, ([code, count]) => ({ code, label: countryLabel(code), count })).sort((a, b) =>
      a.label.localeCompare(b.label)
    )
    return { regionCounts, abroad, noLocation }
  }, [clients])

  function resetFilters() {
    setSearch('')
    setIndustryFilter('')
    setStatusFilter('')
    setCountryFilter('')
    setRegionFilter('')
    setCityFilter('')
  }

  function pickRegion(region: string) {
    resetFilters()
    setCountryFilter('IT')
    setRegionFilter(region)
    setCityFilter('')
    setView('table')
  }
  function pickCountry(code: string) {
    resetFilters()
    setCountryFilter(code)
    setRegionFilter('')
    setCityFilter('')
    setView('table')
  }
  const anyFilterActive = !!(search || industryFilter || statusFilter || countryFilter || regionFilter || cityFilter)

  const sortedClients = useMemo(() => {
    const arr = [...filteredClients]
    arr.sort((a, b) => {
      let av = ''
      let bv = ''
      switch (sortKey) {
        case 'name':
          av = a.name.toLowerCase()
          bv = b.name.toLowerCase()
          break
        case 'industry':
          av = (a.industry || '').toLowerCase()
          bv = (b.industry || '').toLowerCase()
          break
        case 'country':
          av = countryLabel(a.country).toLowerCase()
          bv = countryLabel(b.country).toLowerCase()
          break
        case 'region':
          av = (clientRegion(a) || '').toLowerCase()
          bv = (clientRegion(b) || '').toLowerCase()
          break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filteredClients, sortKey, sortDir])

  useEffect(() => {
    setPage(1)
  }, [search, industryFilter, statusFilter, countryFilter, regionFilter, cityFilter])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(sortedClients.length / PAGE_SIZE))
  const pagedClients = sortedClients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openNewForm() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEditForm(c: ClientDTO) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      description: c.description || '',
      industry: c.industry || '',
      status: c.status,
      ownerId: c.owner?.id || '',
      address: c.address || '',
      country: c.country || '',
      province: c.province || '',
      city: c.city || ''
    })
    setShowForm(true)
  }

  async function saveClient() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      industry: form.industry || null,
      status: form.status,
      ownerId: form.ownerId || null,
      address: form.address.trim() || null,
      country: form.country || null,
      province: form.province || null,
      city: form.city || null
    }
    if (editingId) {
      await fetch(`/api/clients/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } else {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
    setEditingId(null)
    load()
  }

  async function deleteClient(c: ClientDTO) {
    const confirmMsg =
      c.projects.length > 0
        ? `Eliminare "${c.name}"? Verranno eliminati anche i suoi ${c.projects.length} progetti collegati.`
        : `Eliminare il cliente "${c.name}"?`
    if (!confirm(confirmMsg)) return
    const res = await fetch(`/api/clients/${c.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      alert(body.error || `Errore nell'eliminazione (status ${res.status})`)
    }
    load()
  }

  const columns: Column<ClientDTO>[] = [
    {
      id: 'name',
      label: 'Nome',
      sortKey: 'name',
      primary: true,
      render: (c) => (
        <Link href={`/clients/${c.id}`} className="text-brand-600 font-semibold hover:underline">
          {c.name}
        </Link>
      )
    },
    {
      id: 'industry',
      label: 'Industry',
      sortKey: 'industry',
      render: (c) =>
        c.industry ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">{c.industry}</span>
        ) : (
          <span className="text-slate-300">—</span>
        )
    },
    {
      id: 'status',
      label: 'Stato',
      render: (c) => (
        <span
          className={
            c.status === 'inattivo'
              ? 'px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700'
              : 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700'
          }
        >
          {c.status === 'inattivo' ? 'Inattivo' : 'Attivo'}
        </span>
      )
    },
    {
      id: 'country',
      label: 'Country',
      sortKey: 'country',
      render: (c) => (c.country ? countryLabel(c.country) : <span className="text-slate-300">—</span>)
    },
    { id: 'region', label: 'Regione', sortKey: 'region', render: (c) => clientRegion(c) || <span className="text-slate-300">—</span> },
    { id: 'city', label: 'Città', render: (c) => c.city || <span className="text-slate-300">—</span> },
    {
      id: 'activeTasks',
      label: 'Task attivi',
      render: (c) => <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{c.activeTasksCount}</span>
    },
    {
      id: 'actions',
      label: 'Azioni',
      fixed: true,
      align: 'right',
      tdClassName: 'whitespace-nowrap',
      render: (c) => (
        <>
          <button onClick={() => openEditForm(c)} className="inline-flex text-slate-400 hover:text-brand-600 mr-3 align-middle" title="Modifica">
            <EditIcon />
          </button>
          <button onClick={() => deleteClient(c)} className="inline-flex text-slate-400 hover:text-red-600 align-middle" title="Elimina">
            <DeleteIcon />
          </button>
        </>
      )
    }
  ]


  return (
    <div>
      <Breadcrumbs items={[{ label: 'Clienti' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Clienti</h1>
        <div className="flex gap-2 items-center">
          <div className="flex bg-slate-100 rounded-lg p-1">
            {(['table', 'map'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition',
                  view === v ? 'bg-white shadow text-brand-700' : 'text-slate-500'
                )}
              >
                {v === 'table' ? '☰ Tabella' : '🗺 Mappa'}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ↻ Aggiorna
          </button>
          <button
            onClick={openNewForm}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            + Nuovo cliente
          </button>
        </div>
      </div>

      {view === 'table' && (
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2 mb-4">
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Tutte le industry</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Tutti gli stati</option>
          <option value="attivo">Attivo</option>
          <option value="inattivo">Inattivo</option>
        </select>
        <select
          value={countryFilter}
          onChange={(e) => {
            setCountryFilter(e.target.value)
            setRegionFilter('')
            setCityFilter('')
          }}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Tutti i paesi</option>
          {countryOptions.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
          <option value="__none">Località non indicata</option>
        </select>
        <select
          value={regionFilter}
          onChange={(e) => {
            setRegionFilter(e.target.value)
            if (e.target.value) setCountryFilter('IT')
            setCityFilter('')
          }}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Tutte le regioni</option>
          {regionOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Tutte le città</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome cliente..."
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[180px]"
        />
        {anyFilterActive && (
          <button onClick={resetFilters} className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100">
            ✕ Azzera filtri
          </button>
        )}
      </div>
      )}

      {view === 'map' && (
        <ClientsMap
          regionCounts={mapData.regionCounts}
          abroad={mapData.abroad}
          noLocation={mapData.noLocation}
          onSelectRegion={pickRegion}
          onSelectCountry={pickCountry}
        />
      )}

      {view === 'table' && (
      <>
      <DataTable
        tableId="clients"
        columns={columns}
        rows={pagedClients}
        rowKey={(c) => c.id}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(k) => toggleSort(k as SortKey)}
        loading={loading}
        emptyText={
          clients.length === 0
            ? 'Nessun cliente ancora. Aggiungine uno con il pulsante sopra.'
            : 'Nessun cliente trovato con questi filtri.'
        }
      />

      {sortedClients.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
          <span>
            {sortedClients.length} clienti totali — pagina {page} di {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
            >
              ← Precedente
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
            >
              Successiva →
            </button>
          </div>
        </div>
      )}
      </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {editingId ? 'Modifica cliente' : 'Nuovo cliente'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Nome *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Descrizione</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <ClientLocationFields
                value={{ address: form.address, country: form.country, province: form.province, city: form.city }}
                onChange={(loc) => setForm((f) => ({ ...f, ...loc }))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Industry</label>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="">—</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Owner</label>
                  <Combobox
                    value={form.ownerId}
                    onChange={(id) => setForm((f) => ({ ...f, ownerId: id }))}
                    options={owners.map((o) => ({ id: o.id, label: o.name }))}
                    emptyLabel="—"
                    placeholder="Cerca owner..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Stato</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'attivo' | 'inattivo' }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="attivo">Attivo</option>
                    <option value="inattivo">Inattivo</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Se inattivo, non sarà selezionabile per nuovi task.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowForm(false)
                  setForm(emptyForm)
                  setEditingId(null)
                }}
                className="px-4 py-2 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-100"
              >
                Annulla
              </button>
              <button
                onClick={saveClient}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Crea cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
