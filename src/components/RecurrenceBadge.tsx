import { recurrenceLabel, recurrenceShort } from '@/lib/recurrenceShared'

// Pillola viola "🔁 Mensile" per riconoscere a colpo d'occhio i sub-task ricorrenti nelle liste.
export default function RecurrenceBadge({ recurrence }: { recurrence?: string | null }) {
  if (!recurrence) return null
  return (
    <span
      className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-medium whitespace-nowrap"
      title={`Sub-task ricorrente: ${recurrenceLabel(recurrence).toLowerCase()}`}
    >
      <RepeatIcon className="w-3.5 h-3.5" /> {recurrenceShort(recurrence)}
    </span>
  )
}
