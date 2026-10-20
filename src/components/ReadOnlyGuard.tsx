'use client'

import { useSession } from 'next-auth/react'
import clsx from 'clsx'

export const READ_ONLY_MSG = 'Hai privilegi di sola lettura: non puoi effettuare modifiche'

/**
 * Avvolge pulsanti/campi di modifica. Se l'utente e' read_only li disabilita
 * (via <fieldset disabled>) e mostra un tooltip al passaggio del mouse.
 * Per gli altri utenti non cambia nulla.
 */
export default function ReadOnlyGuard({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  const { data: session } = useSession()
  const readOnly = (session?.user as any)?.role === 'read_only'
  return (
    <fieldset
      disabled={readOnly}
      title={readOnly ? READ_ONLY_MSG : undefined}
      className={clsx(
        'm-0 min-w-0 border-0 p-0',
        className,
        readOnly &&
          'cursor-not-allowed [&_button]:pointer-events-none [&_button]:opacity-40 [&_input]:pointer-events-none [&_input]:opacity-40'
      )}
    >
      {children}
    </fieldset>
  )
}
