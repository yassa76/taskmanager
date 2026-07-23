'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function ThemeApplier() {
  const { data: session } = useSession()

  useEffect(() => {
    const theme = (session?.user as any)?.themeColor || 'blue'
    if (theme === 'blue') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [session])

  return null
}
