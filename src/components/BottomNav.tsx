'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

// Barra di navigazione in basso, solo su telefono e tablet: le 4 destinazioni piu' usate + "Altro".
const ITEMS = [
  { href: '/home', label: 'Home', icon: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /> },
  { href: '/tasks', label: 'Task', icon: <path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /> },
  {
    href: '/clients',
    label: 'Clienti',
    icon: <path d="M3 21V7l7-4v18M10 9l11 4v8M7 9h.01M7 13h.01M7 17h.01M15 17h.01M18 17h.01" />
  },
  { href: '/reports', label: 'Report', icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> }
]

export default function BottomNav() {
  const pathname = usePathname()
  const cls = (active: boolean) =>
    clsx('flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium', active ? 'text-brand-700' : 'text-slate-500')

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navigazione principale"
    >
      {ITEMS.map((i) => {
        const active = !!pathname?.startsWith(i.href)
        return (
          <Link key={i.href} href={i.href} className={cls(active)} aria-current={active ? 'page' : undefined}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {i.icon}
            </svg>
            {i.label}
          </Link>
        )
      })}
      <button onClick={() => window.dispatchEvent(new Event('open-nav-menu'))} className={cls(false)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        Altro
      </button>
    </nav>
  )
}
