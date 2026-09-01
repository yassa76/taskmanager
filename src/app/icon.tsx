import { ImageResponse } from 'next/og'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
// Impedisce del tutto la cache (CDN e browser): questa immagine è diversa
// per ogni persona in base al cookie del tema, quindi non va mai condivisa
// tra utenti diversi né riutilizzata da una richiesta all'altra.
export const dynamic = 'force-dynamic'

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

export default function Icon() {
  const cookieStore = cookies()
  const themeCookie = cookieStore.get('themeColor')?.value
  const color = THEME_COLORS[themeCookie || 'blue'] || THEME_COLORS.blue

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
        <div
          style={{
            width: 12,
            height: 7,
            borderLeft: '3px solid white',
            borderBottom: '3px solid white',
            transform: 'rotate(-45deg)',
            marginTop: -2
          }}
        />
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    }
  )
}
