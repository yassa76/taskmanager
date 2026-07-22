import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Task Manager',
  description: 'Gestione task, team e report'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
