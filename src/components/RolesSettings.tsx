'use client'

import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import {
  ACTION_LABELS,
  OBJECT_DEFS,
  SCOPE_LABELS,
  type ActionKey,
  type ObjectKey,
  type PermissionMap,
  type Scope
} from '@/lib/permissionsShared'
import { clearRolesCache } from '@/lib/useRoles'

interface RoleFull {
  key: string
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: PermissionMap
  users: number
}

const ACTIONS: ActionKey[] = ['create', 'update', 'delete']

export default function RolesSettings() {
  const [roles, setRoles] = useState<RoleFull[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selKey, setSelKey] = useState('normal')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [perms, setPerms] = useState<PermissionMap | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [copyFrom, setCopyFrom] = useState('normal')

  const load = useCallback(async () => {
    const r = await fetch('/api/settings/roles?full=1')
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(d.error || 'Errore nel caricare i ruoli')
      setLoading(false)
      return
    }
    setRoles(d.roles)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sel = roles.find((r) => r.key === selKey) ?? roles[0]

  // quando cambia il ruolo scelto (o si ricarica) si riparte dai suoi dati
  useEffect(() => {
    if (!sel) return
    setName(sel.name)
    setDescription(sel.description ?? '')
    setPerms(sel.permissions)
    setDirty(false)
    setSaved(false)
  }, [sel?.key, roles]) // eslint-disable-line react-hooks/exhaustive-deps

  function setCell(obj: ObjectKey, action: ActionKey, v: Scope) {
    setPerms((p) => (p ? { ...p, [obj]: { ...p[obj], [action]: v } } : p))
    setDirty(true)
    setSaved(false)
  }

  async function call(method: string, body: object) {
    const r = await fetch('/api/settings/roles', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(d.error || 'Errore')
      return false
    }
    setError('')
    clearRolesCache()
    return true
  }

  async function save() {
    if (!sel) return
    setSaving(true)
    const ok = await call('PATCH', {
      key: sel.key,
      ...(sel.isSystem ? {} : { name }),
      description,
      permissions: perms
    })
    setSaving(false)
    if (ok) {
      setSaved(true)
      await load()
    }
  }

  async function create() {
    if (!newName.trim()) return
    const before = new Set(roles.map((r) => r.key))
    if (await call('POST', { name: newName.trim(), copyFrom })) {
      setCreating(false)
      setNewName('')
      const r = await fetch('/api/settings/roles?full=1')
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setRoles(d.roles)
        const added = d.roles.find((x: RoleFull) => !before.has(x.key))
        if (added) setSelKey(added.key)
      }
    }
  }

  async function remove() {
    if (!sel || sel.isSystem) return
    if (!confirm(`Eliminare il ruolo "${sel.name}"?`)) return
    if (await call('DELETE', { key: sel.key })) {
      setSelKey('normal')
      await load()
    }
  }

  if (loading) return <p className="text-slate-400">Caricamento...</p>
  const locked = sel?.key === 'admin'

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4 items-start">
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <ul className="space-y-1">
          {roles.map((r) => (
            <li key={r.key}>
              <button
                onClick={() => setSelKey(r.key)}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2',
                  r.key === sel?.key ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <span className="truncate">
                  {r.name}
                  {r.isSystem && <span className="ml-1.5 text-[10px] uppercase text-slate-400">di sistema</span>}
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
              Parti dai permessi di
              <select
                value={copyFrom}
                onChange={(e) => setCopyFrom(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 mt-1 text-sm text-slate-700"
              >
                {roles.map((r) => (
                  <option key={r.key} value={r.key}>
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

      {sel && perms && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 min-w-0">
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <label className="text-xs font-medium text-slate-500">
              Nome
              <input
                value={name}
                disabled={sel.isSystem}
                onChange={(e) => {
                  setName(e.target.value)
                  setDirty(true)
                }}
                maxLength={40}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Descrizione
              <input
                value={description}
                disabled={locked}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setDirty(true)
                }}
                maxLength={200}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
          </div>

          <h3 className="text-sm font-semibold text-slate-700 mb-1">Cosa può fare sugli oggetti</h3>
          <p className="text-xs text-slate-500 mb-3">
            La lettura è per ora aperta a tutti: chi può vedere cosa si deciderà con la visibilità. L&apos;accesso a Team e Admin
            resta riservato al ruolo Admin.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="text-left py-2 pr-3 font-semibold">Oggetto</th>
                  {ACTIONS.map((a) => (
                    <th key={a} className="text-left py-2 px-2 font-semibold">
                      {ACTION_LABELS[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OBJECT_DEFS.map((o) => (
                  <tr key={o.key} className="border-b border-slate-100">
                    <td className="py-2 pr-3 align-top">
                      <span className="font-medium text-slate-700">{o.label}</span>
                      {o.hint && <span className="block text-[11px] text-slate-400">{o.hint}</span>}
                    </td>
                    {ACTIONS.map((a) => {
                      const allowed = o.actions[a]
                      return (
                        <td key={a} className="py-2 px-2 align-top">
                          {allowed ? (
                            <select
                              value={perms[o.key]?.[a] ?? 'none'}
                              disabled={locked}
                              onChange={(e) => setCell(o.key, a, e.target.value as Scope)}
                              className="border border-slate-300 rounded-lg px-2 py-1 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                            >
                              {allowed.map((v) => (
                                <option key={v} value={v}>
                                  {SCOPE_LABELS[v]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {locked && <p className="text-xs text-slate-500 mt-3">Il ruolo Admin ha sempre tutti i permessi e non si modifica.</p>}
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <div className="flex items-center gap-3 mt-4">
            {!locked && (
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            )}
            {saved && <span className="text-sm text-emerald-600">Salvato ✓</span>}
            {!sel.isSystem && (
              <button onClick={remove} className="ml-auto text-sm text-red-600 hover:underline">
                Elimina ruolo
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {sel.users} {sel.users === 1 ? 'persona ha' : 'persone hanno'} questo ruolo. Il ruolo di una persona si cambia da Team.
          </p>
        </div>
      )}
    </div>
  )
}
