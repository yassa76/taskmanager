'use client'

import { ArrowLeftIcon, ArrowRightIcon } from './icons'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import RetentionSelect from './RetentionSelect'

interface Item {
  id: string
  entityType: string
  entityId: string
  entityLabel: string | null
  action: string
  actionLabel: string
  detail: string | null
  userId: string | null
  userName: string | null
  createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  creato: 'bg-emerald-100 text-emerald-700',
  stato: 'bg-amber-100 text-amber-700',
  owner: 'bg-blue-100 text-blue-700',
  eliminato: 'bg-red-100 text-red-700',
  scadenza: 'bg-violet-100 text-violet-700'
}
const TYPE_LABELS: Record<string, string> = { task: 'Task', subtask: 'Sub-task', client: 'Cliente' }
const TYPE_PATHS: Record<string, string> = { task: 'tasks', subtask: 'subtasks', client: 'clients' }

export default function ActivityLogSettings() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('') // ricerca con ritardo, per non interrogare il server a ogni lettera
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let stale = false
    const params = new URLSearchParams({ page: String(page) })
    if (q) params.set('q', q)
    if (entityType) params.set('entityType', entityType)
    if (action) params.set('action', action)
    fetch(`/api/settings/activity?${params.toString()}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error || `Errore (status ${r.status})`)
        return body
      })
      .then((d) => {
        if (stale) return
        setItems(d.items)
        setTotal(d.total)
        setPageSize(d.pageSize)
        setError(null)
      })
      .catch((e) => !stale && setError(e.message))
    return () => {
      stale = true
    }
  }, [page, q, entityType, action])

  const pages = Math.max(1, Math.ceil(total / pageSize))

  function fmt(iso: string) {
    return new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <RetentionSelect kind="activity" />

      <div className="flex flex-wrap gap-2 mt-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per titolo, dettaglio o utente..."
          className="flex-1 min-w-[220px] border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value)
            setPage(1)
          }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Tutti gli oggetti</option>
          <option value="task">Task</option>
          <option value="subtask">Sub-task</option>
          <option value="client">Clienti</option>
        </select>
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setPage(1)
          }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Tutte le azioni</option>
          <option value="creato">Creato</option>
          <option value="stato">Stato modificato</option>
          <option value="owner">Owner riassegnato</option>
          <option value="scadenza">Scadenza modificata</option>
          <option value="eliminato">Eliminato</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      {!items && !error && <p className="text-sm text-slate-400 mt-4">Caricamento...</p>}

      {items && (
        <>
          <div className="mt-4 border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="text-left px-3 py-2 whitespace-nowrap">Quando</th>
                  <th className="text-left px-3 py-2">Utente</th>
                  <th className="text-left px-3 py-2">Azione</th>
                  <th className="text-left px-3 py-2">Oggetto</th>
                  <th className="text-left px-3 py-2">Dettaglio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      Nessuna modifica trovata.
                    </td>
                  </tr>
                )}
                {items.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500">{fmt(l.createdAt)}</td>
                    <td className="px-3 py-2 text-slate-700">{l.userName || 'Sistema'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[l.action] || 'bg-slate-100 text-slate-600'}`}>
                        {l.actionLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-slate-400 mr-1">{TYPE_LABELS[l.entityType] || l.entityType}</span>
                      {l.action !== 'eliminato' && TYPE_PATHS[l.entityType] ? (
                        <Link href={`/${TYPE_PATHS[l.entityType]}/${l.entityId}`} className="text-brand-700 hover:underline">
                          {l.entityLabel || '(senza titolo)'}
                        </Link>
                      ) : (
                        <span className="text-slate-700">{l.entityLabel || '(senza titolo)'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{l.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
            <span>{total.toLocaleString('it-IT')} modifiche</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
              >
                <ArrowLeftIcon />
              </button>
              <span>
                Pagina {page} di {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
              >
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        </>
      )}
      <p className="text-xs text-slate-400 mt-4">
        Creazioni, cambi di stato, owner e scadenza, eliminazioni di task, sub-task e clienti, con chi le ha fatte.
      </p>
    </div>
  )
}
