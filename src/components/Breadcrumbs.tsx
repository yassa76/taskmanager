'use client'

import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center flex-wrap gap-1 text-sm text-slate-500 mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-300">/</span>}
          {item.href ? (
            <Link href={item.href} className="text-brand-600 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-700 font-medium truncate max-w-[240px]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
