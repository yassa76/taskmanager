'use client'

import { SessionProvider } from 'next-auth/react'
import ThemeApplier from './ThemeApplier'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeApplier />
      {children}
    </SessionProvider>
  )
}
