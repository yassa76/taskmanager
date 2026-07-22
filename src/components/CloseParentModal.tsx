'use client'

import type { TaskDTO } from '@/types'

export default function CloseParentModal({
  task,
  onConfirm,
  onDismiss
}: {
  task: TaskDTO
  onConfirm: (confirm: boolean) => void
  onDismiss: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Chiudere anche il task padre?</h2>
        <p className="text-sm text-slate-500 mb-6">
          Tutti i sub-task di <span className="font-semibold text-slate-700">&quot;{task.title}&quot;</span> risultano
          completati. Vuoi contrassegnare come completato anche il task padre?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              onConfirm(false)
              onDismiss()
            }}
            className="px-4 py-2 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-100"
          >
            No, lascia in corso
          </button>
          <button
            onClick={() => {
              onConfirm(true)
              onDismiss()
            }}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            Sì, chiudi il padre
          </button>
        </div>
      </div>
    </div>
  )
}
