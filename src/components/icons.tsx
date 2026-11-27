import React from 'react'

export function EditIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function DeleteIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

// Frecce e casella al posto dei caratteri speciali (▾ ▲ ▼ ☐ ☑), che su alcuni dispositivi compaiono come un quadratino vuoto.
export function ChevronDownIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function ChevronUpIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M6 15l6-6 6 6" />
    </svg>
  )
}

export function CheckboxIcon({ checked, className = 'w-4 h-4' }: { checked: boolean; className?: string }) {
  return (
    <svg {...base} className={`inline-block align-[-3px] ${className}`} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      {checked && <path d="M8 12l3 3 5-6" />}
    </svg>
  )
}

// Icone di sistema al posto di emoji/simboli (che su alcuni dispositivi diventano un quadratino vuoto).
// Usano currentColor: il colore si imposta con le classi del tema (es. text-brand-600).
function mk(paths: React.ReactNode, def = 'w-4 h-4') {
  return function Icon({ className = def }: { className?: string }) {
    return (
      <svg {...base} className={`inline-block shrink-0 ${className}`} aria-hidden="true">
        {paths}
      </svg>
    )
  }
}

export const CheckIcon = mk(<path d="M5 12l5 5 9-10" />)
export const CloseIcon = mk(<path d="M6 6l12 12M18 6L6 18" />)
export const UserIcon = mk(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>)
export const RepeatIcon = mk(<><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>)
export const PlayIcon = mk(<path d="M7 4l13 8-13 8z" />)
export const WarningIcon = mk(<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>)
export const PinIcon = mk(<><path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.500 7 12 7 12z" /><circle cx="12" cy="9" r="2.500" /></>)
export const ListIcon = mk(<path d="M4 6h16M4 12h16M4 18h16" />)
export const KanbanIcon = mk(<><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="17" y="4" width="4" height="13" rx="1" /></>)
export const MapIcon = mk(<><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>)
export const GearIcon = mk(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100L7 17M17 7l2.100-2.100" /></>)
export const ArrowUpIcon = mk(<path d="M12 19V5M6 11l6-6 6 6" />)
export const ArrowDownIcon = mk(<path d="M12 5v14M6 13l6 6 6-6" />)
export const ArrowRightIcon = mk(<path d="M5 12h14M13 6l6 6-6 6" />)
export const ArrowLeftIcon = mk(<path d="M19 12H5M11 6l-6 6 6 6" />)
export const SubArrowIcon = mk(<path d="M6 4v9a3 3 0 0 0 3 3h10M15 12l4 4-4 4" />)
export const RefreshIcon = mk(<><path d="M21 12a9 9 0 0 1-15.500 6.200M3 12a9 9 0 0 1 15.500-6.200" /><path d="M21 4v5h-5M3 20v-5h5" /></>)
export const KeyIcon = mk(<><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3" /></>)
export const MessageIcon = mk(<path d="M4 5h16v11H9l-5 4z" />)
export const CalendarIcon = mk(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>)
export const ClockIcon = mk(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)
export const BellIcon = mk(<><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z" /><path d="M10 21h4" /></>)
export const PartyIcon = mk(<><path d="M4 20l5-14 9 9z" /><path d="M14 4v2M19 9h2M18 3l1 1" /></>)

// Menu a tendina applicato a un campo vuoto: l'icona e' visibile, il select sta sopra, invisibile ma cliccabile.
export function IconSelectWrap({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return (
    <span
      title={title}
      className="relative inline-flex items-center justify-center w-7 h-7 rounded border border-slate-200 text-brand-600 hover:bg-brand-50 shrink-0"
    >
      {icon}
      <span className="absolute inset-0 [&>*]:w-full [&>*]:h-full [&>*]:opacity-0 [&>*]:cursor-pointer">{children}</span>
    </span>
  )
}
