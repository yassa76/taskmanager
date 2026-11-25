'use client'

import { SessionProvider } from 'next-auth/react'
import ThemeApplier from './ThemeApplier'
import ActivityPing from './ActivityPing'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeApplier />
      <ActivityPing />
      {children}
    </SessionProvider>
  )
}
