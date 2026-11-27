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
