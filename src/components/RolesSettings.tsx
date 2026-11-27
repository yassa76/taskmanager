'use client'

import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import {
  ACTIONS,
  ACTION_LABELS,
  GROUP_LABELS,
  OBJECT_DEFS,
  SCOPE_LABELS,
  type GroupKey,
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
  isDefault: boolean
  permissions: PermissionMap
  users: number
}


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
      setError(d.error || 'Errore nel caricare i profili')
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

  // quando cambia il profilo scelto (o si ricarica) si riparte dai suoi dati
  useEffect(() => {
    if (!sel) return
    setName(sel.name)
    setDescription(sel.description ?? '')
    setPerms(sel.permissions)
    setDirty(false)
    setSaved(false)
  }, [sel?.key, roles]) // eslint-disable-line react-hooks/exhaustive-deps

  function setCell(obj: ObjectKey, action: ActionKey, v: Scope) {
    setPerms((p) => {
      if (!p) return p
      const def = OBJECT_DEFS.find((o) => o.key === obj)!
      const row = { ...p[obj], [action]: v }
      if (def.actions.read) {
        // senza "Visualizzare" la sezione non compare: le altre azioni non hanno senso
        if (action === 'read' && v === 'none') for (const a of Object.keys(row) as ActionKey[]) row[a] = 'none'
        else if (action !== 'read' && v !== 'none') row.read = 'all'
      }
      return { ...p, [obj]: row }
    })
    setDirty(true)
    setSaved(false)
  }

  // scorciatoia di riga: tutto il possibile oppure niente
  function setRow(obj: ObjectKey, on: boolean) {
    const def = OBJECT_DEFS.find((o) => o.key === obj)!
    setPerms((p) => {
      if (!p) return p
      const row: Partial<Record<ActionKey, Scope>> = {}
      for (const [a, allowed] of Object.entries(def.actions) as [ActionKey, Scope[]][]) {
        row[a] = on ? allowed[allowed.length - 1] : 'none'
      }
      return { ...p, [obj]: row }
    })
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
      name,
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
    if (!confirm(`Eliminare il profilo "${sel.name}"?`)) return
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
                  {r.isDefault && <span className="ml-1.5 text-[10px] uppercase text-brand-600">predefinito</span>}
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
              placeholder="Nome del profilo"
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
            + Nuovo profilo
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
                onChange={(e) => {
                  setName(e.target.value)
                  setDirty(true)
                }}
                maxLength={40}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm text-slate-800"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Descrizione
              <input
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setDirty(true)
                }}
                maxLength={200}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm text-slate-800"
              />
            </label>
          </div>

          <h3 className="text-sm font-semibold text-slate-700 mb-1">Permessi</h3>
          <p className="text-xs text-slate-500 mb-3">
            Spunta cosa può fare questo profilo. Nelle sezioni di amministrazione, senza "Visualizzare" la sezione non compare
            nemmeno nel menu. Cosa vede sui dati (task, clienti) lo decide invece il ruolo.
          </p>
          <div className="space-y-4">
            {(Object.keys(GROUP_LABELS) as GroupKey[]).map((g) => (
              <div key={g} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{GROUP_LABELS[g]}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] text-slate-500 border-b border-slate-100">
                        <th className="text-left py-1.5 px-3 font-medium">Entità</th>
                        {ACTIONS.map((a) => (
                          <th key={a} className="py-1.5 px-2 font-medium text-center w-24">
                            {ACTION_LABELS[a]}
                          </th>
                        ))}
                        <th className="w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      {OBJECT_DEFS.filter((o) => o.group === g).map((o) => {
                        const anyOn = Object.keys(o.actions).some((a) => (perms[o.key]?.[a as ActionKey] ?? 'none') !== 'none')
                        return (
                          <tr key={o.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                            <td className="py-2 px-3 align-top">
                              <span className="font-medium text-slate-700">{o.label}</span>
                              {o.hint && <span className="block text-[11px] text-slate-400">{o.hint}</span>}
                            </td>
                            {ACTIONS.map((a) => {
                              const allowed = o.actions[a]
                              const val = perms[o.key]?.[a] ?? 'none'
                              return (
                                <td key={a} className="py-2 px-2 text-center align-top">
                                  {!allowed ? (
                                    <span className="text-slate-300">—</span>
                                  ) : allowed.includes('own') ? (
                                    <select
                                      value={val}
                                      disabled={locked}
                                      onChange={(e) => setCell(o.key, a, e.target.value as Scope)}
                                      className="border border-slate-300 rounded-lg px-1.5 py-1 text-xs bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                    >
                                      {allowed.map((v) => (
                                        <option key={v} value={v}>
                                          {SCOPE_LABELS[v]}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={val !== 'none'}
                                      disabled={locked}
                                      onChange={(e) => setCell(o.key, a, e.target.checked ? 'all' : 'none')}
                                      aria-label={`${ACTION_LABELS[a]} ${o.label}`}
                                      className="h-4 w-4 accent-brand-600"
                                    />
                                  )}
                                </td>
                              )
                            })}
                            <td className="py-2 px-2 text-right align-top">
                              {!locked && (
                                <button onClick={() => setRow(o.key, !anyOn)} className="text-[11px] text-brand-600 hover:underline">
                                  {anyOn ? 'Niente' : 'Tutto'}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 mt-4" title={locked ? 'Il profilo Admin non può essere predefinito' : undefined}>
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={sel.isDefault}
              disabled={locked}
              onChange={async (e) => {
                if (await call('PATCH', { key: sel.key, isDefault: e.target.checked })) await load()
              }}
            />
            Predefinito per i nuovi utenti
          </label>
          {locked && <p className="text-xs text-slate-500 mt-3">Il profilo Admin ha sempre tutti i permessi: puoi cambiarne solo il nome e la descrizione.</p>}
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <div className="flex items-center gap-3 mt-4">
            {(
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
                Elimina profilo
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {sel.users} {sel.users === 1 ? 'persona ha' : 'persone hanno'} questo profilo. Il profilo di una persona si cambia da Team.
          </p>
        </div>
      )}
    </div>
  )
}
