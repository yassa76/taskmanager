'use client'

import { SessionProvider } from 'next-auth/react'
import ThemeApplier from './ThemeApplier'
import DensityApplier from './DensityApplier'
import ActivityPing from './ActivityPing'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeApplier />
      <DensityApplier />
      <ActivityPing />
      {children}
    </SessionProvider>
  )
}
