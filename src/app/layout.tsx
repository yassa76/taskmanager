import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import Providers from '@/components/Providers'

const TOKEN_BY_THEME: Record<string, string> = {
  blue: 't1',
  orange: 't2',
  green: 't3',
  purple: 't4',
  red: 't5',
  teal: 't6',
  pink: 't7'
}

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = cookies()
  const theme = cookieStore.get('themeColor')?.value || 'blue'
  const token = TOKEN_BY_THEME[theme] || 't1'
  return {
    title: 'Task Manager',
    description: 'Gestione task, team e report',
    icons: {
      icon: `/api/favicon?t=${token}`
    }
  }
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
