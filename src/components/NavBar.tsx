'use client'

import { scopeIn } from '@/lib/permissionsShared'
import { subnavFor } from '@/lib/subnav'
import ChangelogLink from './ChangelogLink'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import clsx from 'clsx'
import GlobalSearch from './GlobalSearch'
import NotificationBell from './NotificationBell'
import BottomNav from './BottomNav'

const links = [
  { href: '/home', label: 'Home' },
  { href: '/tasks', label: 'Task' },
  { href: '/clients', label: 'Clienti' },
  { href: '/team', label: 'Team' },
  { href: '/reports', label: 'Report & KPI' }
]

export default function NavBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const perms = (session?.user as any)?.permissions
  // la voce Admin compare a chi puo' visualizzare almeno una sezione amministrativa
  const isAdmin = (['profiles', 'orgroles', 'countries', 'geocode', 'activitylog', 'accesslog'] as const).some((o) => scopeIn(perms, o, 'read') !== 'none')
  const baseLinks = scopeIn(perms, 'team', 'read') === 'none' && perms ? links.filter((l) => l.href !== '/team') : links
  const visibleLinks = isAdmin ? [...baseLinks, { href: '/settings', label: 'Admin' }] : baseLinks

  // il menu si chiude quando si cambia pagina
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // il pulsante "Altro" della barra in basso apre lo stesso menu
  useEffect(() => {
    const open = () => setMenuOpen(true)
    window.addEventListener('open-nav-menu', open)
    return () => window.removeEventListener('open-nav-menu', open)
  }, [])

  const sub = subnavFor(pathname, perms, searchParams?.get('tab') ?? null)
  function logout() {
    if (confirm('Sei sicuro di voler uscire?')) signOut({ callbackUrl: '/login' })
  }

  const firstName = (session?.user as any)?.firstName
  const lastName = (session?.user as any)?.lastName
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || session?.user?.name || session?.user?.email

  return (
    <>
    <header className="bg-white border-b border-slate-200 border-t-2 border-t-brand-600 sticky top-0 z-20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 lg:h-16">
        <div className="flex items-center gap-8">
          <Link href="/home" className="font-bold text-brand-600 text-lg hover:text-brand-700">
            Task Manager
          </Link>
          {/* menu completo solo da schermo largo; su telefono e tablet c'e' il menu a tendina */}
          <nav className="hidden lg:flex gap-1">
            {visibleLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  'px-3 py-2 rounded-md text-sm font-medium transition',
                  pathname?.startsWith(l.href) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden lg:block">
          <GlobalSearch />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden lg:block">
            <ChangelogLink />
          </span>
          <NotificationBell />
          {session?.user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="w-8 h-8 rounded-full hidden sm:block" />
          )}
          <Link href="/profile" className="text-sm text-slate-600 hidden lg:block hover:text-brand-600 font-medium">
            {fullName}
          </Link>
          <button
            onClick={logout}
            title="Esci"
            aria-label="Esci"
            className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden w-10 h-10 -mr-2 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100"
            aria-label={menuOpen ? 'Chiudi il menu' : 'Apri il menu'}
            aria-expanded={menuOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {sub && (
        <div className="bg-slate-50 border-t border-slate-200">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto" aria-label="Sottovoci">
            {sub.items.map((i) => (
              <Link
                key={i.id}
                href={i.href}
                className={clsx(
                  'px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px',
                  i.id === sub.activeId
                    ? 'border-brand-600 text-brand-700 font-medium'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {i.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {menuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pb-4 pt-3 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="mb-3">
            <GlobalSearch />
          </div>
          <nav className="flex flex-col gap-1">
            {visibleLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  'px-3 py-3 rounded-lg text-base font-medium',
                  pathname?.startsWith(l.href) ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                {l.label}
              </Link>
            ))}
            <ChangelogLink mobile />
          </nav>
          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
            <Link href="/profile" className="text-sm text-slate-700 font-medium py-2">
              {fullName}
            </Link>
            <button
              onClick={logout}
              className="text-sm text-red-600 font-medium px-3 py-2 rounded-lg hover:bg-red-50"
            >
              Esci
            </button>
          </div>
        </div>
      )}
    </header>
    <BottomNav />
    </>
  )
}
