// Numero di sub-task attivi (da avviare o in corso) di un task, con dettaglio al passaggio del mouse.
export default function SubtaskCount({
  active,
  total,
  tooltip
}: {
  active: number
  total: number
  tooltip?: string
}) {
  const done = total - active
  return (
    <span
      className={
        active > 0
          ? 'inline-flex min-w-[1.75rem] justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700'
          : 'inline-flex min-w-[1.75rem] justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400'
      }
      title={tooltip ?? `${active} attivi su ${total} sub-task${total > 0 ? ` (${done} completati o annullati)` : ''}`}
    >
      {active}
    </span>
  )
}
