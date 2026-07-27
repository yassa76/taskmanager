'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SearchItem {
  id: string
  title: string
  subtitle?: string
  href: string
}

interface SearchGroup {
  type: string
  label: string
  items: SearchItem[]
}

const MIN_CHARS = 3

export default function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (query.trim().length < MIN_CHARS) {
      setGroups([])
      setOpen(false)
      return
    }
    setLoading(true)
    const handle = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          setGroups(data.groups || [])
          setOpen(true)
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [query])

  function goTo(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const hasResults = groups.some((g) => g.items.length > 0)

  return (
    <div ref={containerRef} className="relative w-56 sm:w-72">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (groups.length > 0) setOpen(true)
        }}
        placeholder="Cerca task, clienti, persone..."
        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white"
      />
      {open && (
        <div className="absolute z-40 mt-1 w-80 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {loading && <p className="px-3 py-2 text-sm text-slate-400">Ricerca...</p>}
          {!loading && !hasResults && <p className="px-3 py-2 text-sm text-slate-400">Nessun risultato.</p>}
          {!loading &&
            groups.map((g) => (
              <div key={g.type} className="border-b border-slate-100 last:border-0">
                <p className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-400 uppercase">{g.label}</p>
                {g.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => goTo(item.href)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 flex flex-col"
                  >
                    <span className="text-slate-800 truncate">{item.title}</span>
                    {item.subtitle && <span className="text-xs text-slate-400 truncate">{item.subtitle}</span>}
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
