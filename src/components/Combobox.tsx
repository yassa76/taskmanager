'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'

export interface ComboboxOption {
  id: string
  label: string
}

/**
 * Dropdown con ricerca. Pensato per sostituire i <select> nei punti dove la
 * lista puo' crescere molto (owner, clienti): l'utente digita e la lista si
 * filtra in tempo reale, invece di scorrere un menu nativo lunghissimo.
 *
 * - emptyLabel: se passato, aggiunge una voce "vuota" in cima (es. "Tutti gli owner")
 *   utile per i filtri; se omesso, il campo richiede sempre una selezione (uso nei form).
 */
export default function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Cerca...',
  emptyLabel,
  className
}: {
  options: ComboboxOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  emptyLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.id === value)

  const filtered = useMemo(() => {
    const list = emptyLabel ? [{ id: '', label: emptyLabel }, ...options] : options
    if (!query) return list
    return list.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
  }, [options, query, emptyLabel])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) {
      setHighlight(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  function select(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlight]) select(filtered[highlight].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-left bg-white flex items-center justify-between gap-2 hover:border-slate-300"
      >
        <span className={clsx('truncate', !selected && 'text-slate-500')}>
          {selected ? selected.label : emptyLabel || 'Seleziona...'}
        </span>
        <span className="text-slate-400 shrink-0 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setHighlight(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm border-b border-slate-100 outline-none"
          />
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">Nessun risultato.</p>}
            {filtered.map((o, i) => (
              <button
                key={o.id || '__empty__'}
                type="button"
                onClick={() => select(o.id)}
                onMouseEnter={() => setHighlight(i)}
                className={clsx(
                  'w-full text-left px-3 py-2 text-sm truncate',
                  i === highlight ? 'bg-brand-50 text-brand-700' : 'text-slate-700',
                  o.id === value && 'font-semibold'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
