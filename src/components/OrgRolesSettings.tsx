'use client'

import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import {
  CLIENT_VISIBILITY_LABELS,
  TASK_VISIBILITY_LABELS,
  type ClientVisibility,
  type TaskVisibility
} from '@/lib/visibilityShared'
import { clearOrgRolesCache, orderTree, type OrgRoleOption } from '@/lib/useOrgRoles'

export default function OrgRolesSettings() {
  const [roles, setRoles] = useState<OrgRoleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [taskVis, setTaskVis] = useState<TaskVisibility>('own_and_below')
  const [clientVis, setClientVis] = useState<ClientVisibility>('all')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newParent, setNewParent] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/settings/org-roles')
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(d.error || 'Errore nel caricare i ruoli')
      setLoading(false)
      return
    }
    setRoles(orderTree(d.orgRoles) as OrgRoleOption[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sel = roles.find((r) => r.id === selId) ?? roles[0]

  useEffect(() => {
    if (!sel) return
    setName(sel.name)
    setDescription(sel.description ?? '')
    setParentId(sel.parentId ?? '')
    setTaskVis(sel.taskVisibility as TaskVisibility)
    setClientVis(sel.clientVisibility as ClientVisibility)
    setDirty(false)
    setSaved(false)
  }, [sel?.id, roles]) // eslint-disable-line react-hooks/exhaustive-deps

  // ruoli che possono stare sopra quello scelto: tutti tranne lui e i suoi sottostanti
  function below(id: string): Set<string> {
    const out = new Set<string>()
    const walk = (p: string) =>
      roles.filter((r) => r.parentId === p).forEach((r) => {
        out.add(r.id)
        walk(r.id)
      })
    walk(id)
    return out
  }

  async function call(method: string, body: object) {
    const r = await fetch('/api/settings/org-roles', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(d.error || 'Errore')
      return null
    }
    setError('')
    clearOrgRolesCache()
    return d
  }

  async function save() {
    if (!sel) return
    setSaving(true)
    const d = await call('PATCH', {
      id: sel.id,
      name,
      description,
      parentId: parentId || null,
      taskVisibility: taskVis,
      clientVisibility: clientVis
    })
    setSaving(false)
    if (d) {
      setSaved(true)
      await load()
    }
  }

  async function create() {
    if (!newName.trim()) return
    const d = await call('POST', { name: newName.trim(), parentId: newParent || null })
    if (d) {
      setCreating(false)
      setNewName('')
      setNewParent('')
      await load()
      setSelId(d.id)
    }
  }

  async function remove() {
    if (!sel) return
    if (!confirm(`Eliminare il ruolo "${sel.name}"? I ruoli sottostanti salgono di un livello.`)) return
    if (await call('DELETE', { id: sel.id })) {
      setSelId(null)
      await load()
    }
  }

  if (loading) return <p className="text-slate-400">Caricamento...</p>
  const excluded = sel ? new Set([sel.id, ...Array.from(below(sel.id))]) : new Set<string>()
  const mark = () => {
    setDirty(true)
    setSaved(false)
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3 max-w-3xl">
        I ruoli formano la gerarchia dell&apos;azienda e decidono <strong>chi vede cosa</strong>: per ogni ruolo scegli quali task e
        quali clienti sono visibili. Chi può fare cosa si decide invece con i Profili. Una persona senza ruolo vede tutto, come
        prima; il profilo Admin vede sempre tutto.
      </p>
      <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          {roles.length === 0 && <p className="text-sm text-slate-400 px-2 py-2">Nessun ruolo: creane uno.</p>}
          <ul className="space-y-1">
            {roles.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelId(r.id)}
                  style={{ paddingLeft: 12 + r.depth * 16 }}
                  className={clsx(
                    'w-full text-left py-2 pr-3 rounded-lg text-sm flex items-center justify-between gap-2',
                    r.id === sel?.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span className="truncate">
                    {r.depth > 0 && <span className="text-slate-300 mr-1">└</span>}
                    {r.name}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{r.users}</span>
                </button>
              </li>
            ))}
          </ul>
          {creating ? (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-sm">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome del ruolo"
                maxLength={40}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5"
              />
              <label className="block text-xs text-slate-500">
                Risponde a
                <select
                  value={newParent}
                  onChange={(e) => setNewParent(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 mt-1 text-sm text-slate-700"
                >
                  <option value="">Nessuno (in cima)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {'— '.repeat(r.depth)}
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button onClick={create} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium">
                  Crea
                </button>
                <button onClick={() => setCreating(false)} className="px-3 py-1.5 text-xs text-slate-500">
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} className="mt-3 text-sm text-brand-600 hover:underline px-3">
              + Nuovo ruolo
            </button>
          )}
        </div>

        {sel && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 min-w-0 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs font-medium text-slate-500">
                Nome
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    mark()
                  }}
                  maxLength={40}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm text-slate-800"
                />
              </label>
              <label className="text-xs font-medium text-slate-500">
                Risponde a
                <select
                  value={parentId}
                  onChange={(e) => {
                    setParentId(e.target.value)
                    mark()
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm text-slate-800 bg-white"
                >
                  <option value="">Nessuno (in cima)</option>
                  {roles
                    .filter((r) => !excluded.has(r.id))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {'— '.repeat(r.depth)}
                        {r.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-500 sm:col-span-2">
                Descrizione
                <input
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    mark()
                  }}
                  maxLength={200}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm text-slate-800"
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs font-medium text-slate-500">
                Task e sub-task visibili
                <select
                  value={taskVis}
                  onChange={(e) => {
                    setTaskVis(e.target.value as TaskVisibility)
                    mark()
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm text-slate-800 bg-white"
                >
                  {(Object.keys(TASK_VISIBILITY_LABELS) as TaskVisibility[]).map((k) => (
                    <option key={k} value={k}>
                      {TASK_VISIBILITY_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-500">
                Clienti visibili
                <select
                  value={clientVis}
                  onChange={(e) => {
                    setClientVis(e.target.value as ClientVisibility)
                    mark()
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm text-slate-800 bg-white"
                >
                  {(Object.keys(CLIENT_VISIBILITY_LABELS) as ClientVisibility[]).map((k) => (
                    <option key={k} value={k}>
                      {CLIENT_VISIBILITY_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Un cliente visibile mostra solo i task che la persona può vedere, e i totali si calcolano su quelli. Un task è
              visibile anche se la persona ha un suo sub-task al suo interno.
            </p>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
              {saved && <span className="text-sm text-emerald-600">Salvato ✓</span>}
              <button onClick={remove} className="ml-auto text-sm text-red-600 hover:underline">
                Elimina ruolo
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {sel.users} {sel.users === 1 ? 'persona ha' : 'persone hanno'} questo ruolo. Il ruolo di una persona si cambia da Team.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
