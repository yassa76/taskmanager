'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import clsx from 'clsx'

const links = [
  { href: '/tasks', label: 'Task' },
  { href: '/clients', label: 'Clienti' },
  { href: '/team', label: 'Team' },
  { href: '/reports', label: 'Report & KPI' }
]

export default function NavBar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <span className="font-bold text-brand-600 text-lg">Task Manager</span>
          <nav className="flex gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  'px-3 py-2 rounded-md text-sm font-medium transition',
                  pathname?.startsWith(l.href)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session?.user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
          )}
          <span className="text-sm text-slate-600 hidden sm:block">{session?.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-sm text-slate-500 hover:text-red-600 font-medium"
          >
            Esci
          </button>
        </div>
      </div>
    </header>
  )
}
