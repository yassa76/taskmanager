'use client'

import { useState } from 'react'
import mapData from '@/data/it-regions-map.json'

interface Props {
  // numero di clienti per nome regione (es. { Lazio: 3 })
  regionCounts: Record<string, number>
  // paesi diversi dall'Italia: label + numero clienti + codice
  abroad: { code: string; label: string; count: number }[]
  noLocation: number
  onSelectRegion: (region: string) => void
  onSelectCountry: (code: string) => void
}

interface MapRegion {
  code: string
  name: string
  d: string
  lx: number
  ly: number
}

export default function ClientsMap({ regionCounts, abroad, noLocation, onSelectRegion, onSelectCountry }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const regions = mapData.regions as MapRegion[]
  const max = Math.max(1, ...Object.values(regionCounts))

  function fillFor(name: string) {
    const n = regionCounts[name] || 0
    if (n === 0) return 'rgb(241 245 249)' // slate-100
    // da azzurro chiaro a brand scuro in base al numero di clienti
    const t = 0.25 + 0.6 * (n / max)
    return `rgb(var(--brand-600) / ${t.toFixed(2)})`
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 flex justify-center">
          <svg
            viewBox={`0 0 ${mapData.width} ${mapData.height}`}
            className="w-full max-w-[560px] h-auto"
            role="img"
            aria-label="Mappa dei clienti per regione"
          >
            {regions.map((r) => {
              const n = regionCounts[r.name] || 0
              return (
                <g
                  key={r.code}
                  onClick={() => onSelectRegion(r.name)}
                  onMouseEnter={() => setHover(r.name)}
                  onMouseLeave={() => setHover(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectRegion(r.name)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${r.name}: ${n} clienti`}
                  className="cursor-pointer outline-none"
                >
                  <path
                    d={r.d}
                    style={{ fill: fillFor(r.name) }}
                    stroke={hover === r.name ? '#1e293b' : '#64748b'}
                    strokeWidth={hover === r.name ? 1.6 : 0.8}
                    strokeLinejoin="round"
                  />
                  <text
                    x={r.lx}
                    y={r.ly}
                    textAnchor="middle"
                    fontSize={9.5}
                    fill="#0f172a"
                    stroke="#fff"
                    strokeWidth={2.5}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    <tspan x={r.lx}>{r.name}</tspan>
                    <tspan x={r.lx} dy={11} fontWeight={700}>
                      ({n})
                    </tspan>
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="lg:w-64 shrink-0 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">All&apos;estero</h3>
            {abroad.length === 0 ? (
              <p className="text-sm text-slate-400">Nessun cliente all&apos;estero.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {abroad.map((a) => (
                  <button
                    key={a.code}
                    onClick={() => onSelectCountry(a.code)}
                    className="px-3 py-1.5 rounded-full border border-slate-300 text-sm text-slate-700 hover:bg-brand-50 hover:border-brand-600"
                  >
                    {a.label} ({a.count})
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Senza località</h3>
            <button
              onClick={() => onSelectCountry('__none')}
              disabled={noLocation === 0}
              className="px-3 py-1.5 rounded-full border border-slate-300 text-sm text-slate-700 hover:bg-brand-50 hover:border-brand-600 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-slate-300"
            >
              Località non indicata ({noLocation})
            </button>
            <p className="text-xs text-slate-400 mt-2">
              Include anche i clienti italiani senza provincia. Clicca una regione per vedere l&apos;elenco.
            </p>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-3">Confini regionali © Openpolis, CC BY 4.0 (dati ISTAT).</p>
    </div>
  )
}
