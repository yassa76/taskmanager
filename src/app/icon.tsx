import { ImageResponse } from 'next/og'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

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
        <span style={{ color: 'white', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>✓</span>
      </div>
    ),
    { ...size }
  )
}
