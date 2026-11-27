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

const ACTIVE_WINDOW_MS = 15 * 60 * 1000

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

// Accessi per persona: ultimo login e ultima attivita'. Niente elenco dei singoli login.
export default function AccessLogSettings() {
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/access')
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error || `Errore (status ${r.status})`)
        return body
      })
      .then((d) => setUsers(d.users))
      .catch((e) => setError(e.message))
  }, [])

  const now = Date.now()

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!users && !error && <p className="text-sm text-slate-400">Caricamento...</p>}
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
      <RetentionSelect kind="access" />
      <p className="text-xs text-slate-400 mt-3">
        &quot;Ultimo accesso&quot; è l&apos;ultimo login. &quot;Ultima attività&quot; è l&apos;ultima volta che la persona ha usato davvero
        l&apos;app: una finestra rimasta aperta e ferma non la aggiorna. Il pallino verde indica attività negli ultimi 15 minuti.
        Non si registrano indirizzi IP né dati del browser; un accesso più vecchio del periodo di conservazione non compare più.
      </p>
    </div>
  )
}
