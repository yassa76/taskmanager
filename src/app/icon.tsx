import { ImageResponse } from 'next/og'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

const THEME_COLORS: Record<string, string> = {
  blue: '#2f49b3',
  orange: '#ea580c',
  green: '#16a34a',
  purple: '#7c3aed',
  red: '#dc2626',
  teal: '#0d9488',
  pink: '#db2777'
}

export default async function Icon() {
  let color = THEME_COLORS.blue
  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      const userId = (session.user as any).id
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { themeColor: true } })
      color = THEME_COLORS[user?.themeColor || 'blue'] || THEME_COLORS.blue
    }
  } catch {
    // Se qualcosa va storto (utente non loggato, errore DB) usiamo il blu di default.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: color,
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span style={{ color: 'white', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>✓</span>
      </div>
    ),
    { ...size }
  )
}
