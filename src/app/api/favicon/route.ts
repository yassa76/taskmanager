import { NextRequest, NextResponse } from 'next/server'

const THEME_BY_TOKEN: Record<string, string> = {
  t1: '#2f49b3', // blue
  t2: '#ea580c', // orange
  t3: '#16a34a', // green
  t4: '#7c3aed', // purple
  t5: '#dc2626', // red
  t6: '#0d9488', // teal
  t7: '#db2777'  // pink
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('t') || 't1'
  const color = THEME_BY_TOKEN[token] || THEME_BY_TOKEN.t1

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${color}"/>
  <path d="M9 17.5 L14 22 L23 11" fill="none" stroke="white" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}
