'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import type { ClientDTO, TaskDTO } from '@/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/taskStatus'

export default function ClientDetailView({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<ClientDTO | null>(null)
  const [tasks, setTasks] = useState<TaskDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [clientRes, tasksRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/tasks?clientId=${clientId}`)
      ])
      if (!clientRes.ok) {
        setError(`Errore nel caricare il cliente (status ${clientRes.status})`)
        return
      }
      setClient(await clientRes.json())
      setTasks(tasksRes.ok ? await tasksRes.json() : [])
    } catch (e: any) {
      setError(`Errore imprevisto: ${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  if (loading) return <p className="text-slate-400">Caricamento...</p>
  if (error) return <p className="text-red-500">{error}</p>
  if (!client) return <p className="text-slate-400">Cliente non trovato.</p>

  return (
    <div>
      <Link href="/clients" className="text-sm text-brand-600 hover:underline mb-4 inline-block">
        ← Torna ai clienti
      </Link>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-xl font-bold text-slate-800">{client.name}</h1>
          {client.industry && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
              {client.industry}
            </span>
          )}
        </div>
        {client.description && <p className="text-slate-500 text-sm mt-2">{client.description}</p>}
        <p className="text-xs text-slate-400 mt-2">
          Owner: {client.owner ? client.owner.name || client.owner.email : '—'}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Task associati</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Task</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Owner</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stato</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/tasks/${t.id}`} className="text-brand-600 font-semibold hover:underline">
                    {t.title}
                  </Link>
                </td>
                <td className="px-4 py-2">{t.owner.name || t.owner.email}</td>
                <td className="px-4 py-2">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[t.status])}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-6 text-slate-400">
                  Nessun task associato a questo cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
