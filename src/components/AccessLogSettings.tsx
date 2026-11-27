'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import RetentionSelect from './RetentionSelect'

interface UserRow {
  id: string
  name: string
  email: string
  lastLoginAt: string | null
  lastActiveAt: string | null
}
interface LogRow {
  id: string
  userId: string
  userName: string
  createdAt: string
}

const ACTIVE_WINDOW_MS = 15 * 60 * 1000

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

export default function AccessLogSettings() {
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [items, setItems] = useState<LogRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
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
    fetch(`/api/settings/access?${params.toString()}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error || `Errore (status ${r.status})`)
        return body
      })
      .then((d) => {
        if (stale) return
        setUsers(d.users)
        setItems(d.items)
        setTotal(d.total)
        setPageSize(d.pageSize)
        setError(null)
      })
      .catch((e) => !stale && setError(e.message))
    return () => {
      stale = true
    }
  }, [page, q])

  const pages = Math.max(1, Math.ceil(total / pageSize))
  const now = Date.now()

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Utenti</h2>
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        {users && (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Utente</th>
                  <th className="text-left px-3 py-2 whitespace-nowrap">Ultimo accesso</th>
                  <th className="text-left px-3 py-2 whitespace-nowrap">Ultima attività</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const active = !!u.lastActiveAt && now - new Date(u.lastActiveAt).getTime() < ACTIVE_WINDOW_MS
                  return (
                    <tr key={u.id}>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-2 ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          title={active ? 'Attivo negli ultimi 15 minuti' : 'Non attivo'}
                        />
                        <Link href={`/owners/${u.id}`} className="text-slate-800 hover:underline">
                          {u.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{fmt(u.lastLoginAt)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{fmt(u.lastActiveAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3">
          &quot;Ultimo accesso&quot; è l&apos;ultimo login. &quot;Ultima attività&quot; è l&apos;ultima volta che la persona ha usato
          davvero l&apos;app: una finestra rimasta aperta e ferma non la aggiorna. Il pallino verde indica attività negli ultimi
          15 minuti.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-800 mb-1">Registro accessi</h2>
        <RetentionSelect kind="access" />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome o email..."
          className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm mt-4"
        />

        {items && (
          <>
            <div className="mt-4 border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Quando</th>
                    <th className="text-left px-3 py-2">Utente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-3 py-6 text-center text-slate-400">
                        Nessun accesso registrato.
                      </td>
                    </tr>
                  )}
                  {items.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{fmt(l.createdAt)}</td>
                      <td className="px-3 py-2 text-slate-700">{l.userName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
              <span>{total.toLocaleString('it-IT')} accessi</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
                >
                  ←
                </button>
                <span>
                  Pagina {page} di {pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}
        <p className="text-xs text-slate-400 mt-3">Una riga per ogni login. Non si registrano indirizzi IP né dati del browser.</p>
      </div>
    </div>
  )
}
