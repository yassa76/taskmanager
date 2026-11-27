'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { useColumnPrefs } from '@/lib/useColumnPrefs'

export interface Column<T> {
  id: string
  label: string
  render: (row: T) => ReactNode
  /** chiave di ordinamento: se presente l'intestazione e' cliccabile */
  sortKey?: string
  align?: 'left' | 'center' | 'right'
  tdClassName?: string
  title?: string
  /** colonna principale: su telefono e' il titolo della scheda */
  primary?: boolean
  /** colonna delle azioni: resta sempre in fondo, non si sposta e non si nasconde */
  fixed?: boolean
  /** colonna nascosta di default (l'utente puo' mostrarla) */
  defaultHidden?: boolean
}

interface Props<T> {
  tableId: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  loading?: boolean
  emptyText?: ReactNode
  rowClassName?: (row: T) => string | undefined
  /** nasconde il pulsante "Colonne" (es. tabelle minuscole) */
  noCustomize?: boolean
  /** senza bordo e ombra esterni: per tabelle dentro una scheda che li ha gia' */
  bare?: boolean
}

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' }

// Tabella con colonne riordinabili/nascondibili per utente (trascinando le intestazioni o dal pannello
// "Colonne") e, su telefono, una vista a schede al posto della tabella.
export default function DataTable<T>({
  tableId,
  columns,
  rows,
  rowKey,
  sortKey,
  sortDir,
  onSort,
  loading,
  emptyText = 'Nessun elemento.',
  rowClassName,
  noCustomize,
  bare
}: Props<T>) {
  const { pref, save, reset } = useColumnPrefs(tableId)
  // Personalizzare le colonne (riordino, nascondi, mostra) si puo' solo da desktop (>= 1024px):
  // su tablet e telefono resta la vista semplice, senza nulla da spostare per sbaglio.
  const desktop = useIsDesktop()
  const canCustomize = desktop && !noCustomize
  // pannello "Mostra colonne": posizione sullo schermo (null = chiuso)
  const [panelAt, setPanelAt] = useState<{ x: number; y: number } | null>(null)
  // menu del tasto destro su un'intestazione
  const [menu, setMenu] = useState<{ x: number; y: number; colId: string } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dragId = useRef<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const movable = useMemo(() => columns.filter((c) => !c.fixed), [columns])
  const fixedCols = useMemo(() => columns.filter((c) => c.fixed), [columns])

  // ordine effettivo: quello salvato (ignorando id sconosciuti) + eventuali colonne nuove in coda
  const order = useMemo(() => {
    const ids = movable.map((c) => c.id)
    const saved = (pref?.order ?? []).filter((id) => ids.includes(id))
    return [...saved, ...ids.filter((id) => !saved.includes(id))]
  }, [movable, pref])

  const hidden = useMemo(
    () => new Set(pref ? pref.hidden : movable.filter((c) => c.defaultHidden).map((c) => c.id)),
    [movable, pref]
  )

  const visible = useMemo(() => {
    const byId = new Map(movable.map((c) => [c.id, c]))
    const list = order.map((id) => byId.get(id)!).filter((c) => c && !hidden.has(c.id))
    // la colonna principale non si puo' nascondere: se serve la si rimette in testa
    const primary = movable.find((c) => c.primary)
    if (primary && !list.includes(primary)) list.unshift(primary)
    return [...list, ...fixedCols]
  }, [movable, order, hidden, fixedCols])

  function commit(nextOrder: string[], nextHidden: Set<string>) {
    save({ order: nextOrder, hidden: Array.from(nextHidden) })
  }

  function moveTo(id: string, targetId: string) {
    if (id === targetId) return
    const next = order.filter((x) => x !== id)
    const at = next.indexOf(targetId)
    // si inserisce prima della colonna di destinazione se si veniva da destra, dopo se da sinistra
    const from = order.indexOf(id)
    const to = order.indexOf(targetId)
    next.splice(from < to ? at + 1 : at, 0, id)
    commit(next, hidden)
  }

  function toggle(id: string) {
    const next = new Set(hidden)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    commit(order, next)
  }

  const primaryCol = visible.find((c) => c.primary) ?? visible[0]
  const actionCols = visible.filter((c) => c.fixed)
  const detailCols = visible.filter((c) => !c.fixed && c !== primaryCol)

  const empty = !loading && rows.length === 0

  return (
    <div>
      {canCustomize && (
        <div className={clsx('flex justify-end mb-1', bare && 'px-3 pt-1')}>
          <button
            ref={btnRef}
            onClick={() => {
              const r = btnRef.current?.getBoundingClientRect()
              setPanelAt(panelAt ? null : { x: (r?.right ?? 300) - 288, y: (r?.bottom ?? 0) + 4 })
            }}
            className="text-xs text-slate-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-slate-100"
            title="Scegli quali colonne vedere. Puoi anche trascinare le intestazioni o cliccarle con il tasto destro."
          >
            ⚙ Colonne
          </button>
        </div>
      )}

      {canCustomize && menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu(null)
            }}
          />
          <div
            className="fixed z-50 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm"
            style={{ left: Math.min(menu.x, window.innerWidth - 216), top: Math.min(menu.y, window.innerHeight - 100) }}
          >
            {(() => {
              const col = columns.find((c) => c.id === menu.colId)
              const canHide = !!col && !col.fixed && !col.primary
              return (
                <button
                  disabled={!canHide}
                  onClick={() => {
                    if (col) toggle(col.id)
                    setMenu(null)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-transparent"
                  title={canHide ? undefined : 'Questa colonna non si può nascondere'}
                >
                  Nascondi colonna{col ? ` «${col.label}»` : ''}
                </button>
              )
            })()}
            <button
              onClick={() => {
                setPanelAt({ x: menu.x, y: menu.y })
                setMenu(null)
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              Mostra colonne…
            </button>
          </div>
        </>
      )}

      {canCustomize && panelAt && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setPanelAt(null)} />
          <div
            className="fixed w-72 max-w-[92vw] bg-white border border-slate-200 rounded-xl shadow-lg z-40 p-3"
            style={{ left: Math.max(8, Math.min(panelAt.x, window.innerWidth - 296)), top: Math.min(panelAt.y, window.innerHeight - 380) }}
          >
            <p className="text-xs text-slate-500 mb-2">
              Spunta le colonne da vedere e riordinale trascinandole. La scelta è solo tua.
            </p>
            <ul className="space-y-1 max-h-72 overflow-y-auto">
              {order.map((id) => {
                const c = movable.find((m) => m.id === id)!
                return (
                  <li
                    key={id}
                    draggable
                    onDragStart={() => (dragId.current = id)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setOverId(id)
                    }}
                    onDragLeave={() => setOverId((o) => (o === id ? null : o))}
                    onDrop={() => {
                      if (dragId.current) moveTo(dragId.current, id)
                      dragId.current = null
                      setOverId(null)
                    }}
                    className={clsx(
                      'flex items-center gap-2 px-2 py-1.5 rounded-lg border text-sm',
                      overId === id ? 'border-brand-500 bg-brand-50' : 'border-slate-100'
                    )}
                  >
                    <span className="cursor-grab text-slate-300 select-none" aria-hidden>
                      ⋮⋮
                    </span>
                    <label className="flex-1 flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={!hidden.has(id) || !!c.primary}
                        disabled={!!c.primary}
                        onChange={() => toggle(id)}
                        className="accent-brand-600"
                      />
                      <span className="truncate">{c.label}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
            <button onClick={reset} className="mt-2 text-xs text-brand-600 hover:underline">
              Ripristina ordine e colonne predefiniti
            </button>
          </div>
        </>
      )}

      {/* Telefono: una scheda per riga */}
      <div className={clsx('md:hidden space-y-2', bare && 'p-3')}>
        {loading && <p className="text-center py-8 text-slate-400">Caricamento...</p>}
        {empty && <div className="text-center py-8 text-slate-400 text-sm">{emptyText}</div>}
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            className={clsx('bg-white border border-slate-200 rounded-xl p-3 shadow-sm', rowClassName?.(row))}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 font-semibold">{primaryCol?.render(row)}</div>
              {actionCols.length > 0 && (
                <div className="shrink-0 flex items-center gap-3">{actionCols.map((c) => <span key={c.id}>{c.render(row)}</span>)}</div>
              )}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              {detailCols.map((c) => (
                <div key={c.id} className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-400">{c.label}</dt>
                  <dd className="text-slate-700">{c.render(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Schermi medi e grandi: tabella */}
      <div className={clsx('hidden md:block overflow-x-auto', !bare && 'bg-white rounded-xl border border-slate-200 shadow-sm')}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {visible.map((c) => {
                const canDrag = !c.fixed && canCustomize
                return (
                  <th
                    key={c.id}
                    title={c.title}
                    draggable={canDrag}
                    onDragStart={() => (dragId.current = c.id)}
                    onDragOver={(e) => {
                      if (canDrag && dragId.current) {
                        e.preventDefault()
                        setOverId(c.id)
                      }
                    }}
                    onDragLeave={() => setOverId((o) => (o === c.id ? null : o))}
                    onDrop={() => {
                      if (canDrag && dragId.current) moveTo(dragId.current, c.id)
                      dragId.current = null
                      setOverId(null)
                    }}
                    onContextMenu={(e) => {
                      if (!canCustomize) return
                      e.preventDefault()
                      setMenu({ x: e.clientX, y: e.clientY, colId: c.id })
                    }}
                    onClick={() => c.sortKey && onSort?.(c.sortKey)}
                    className={clsx(
                      'px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap select-none',
                      ALIGN[c.align ?? 'left'],
                      c.sortKey && 'cursor-pointer hover:text-brand-600',
                      canDrag && 'cursor-grab',
                      overId === c.id && 'bg-brand-50'
                    )}
                  >
                    {c.label}
                    {c.sortKey && sortKey === c.sortKey ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={visible.length} className="text-center py-8 text-slate-400">
                  Caricamento...
                </td>
              </tr>
            )}
            {empty && (
              <tr>
                <td colSpan={visible.length} className="text-center py-8 text-slate-400">
                  {emptyText}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={rowKey(row)} className={clsx('border-b border-slate-100 hover:bg-slate-50', rowClassName?.(row))}>
                {visible.map((c) => (
                  <td key={c.id} className={clsx('px-3 py-2', ALIGN[c.align ?? 'left'], c.tdClassName)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// true solo su schermo largo (desktop): li' si puo' usare mouse, tasto destro e trascinamento
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
    const update = () => setDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return desktop
}
