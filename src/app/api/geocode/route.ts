import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canCreate } from '@/lib/permissions'
import { reserveGeocodeCall } from '@/lib/geocodeLimits'
import { matchItalianCity, resolveProvinceSigla, type GeocodeCandidate } from '@/lib/geo'

// Normalizza un indirizzo con la Geocoding API di Google e restituisce fino a
// 5 candidati tra cui scegliere. UNA sola chiamata per richiesta, nessun
// tentativo automatico: ogni chiamata viene contata e puo' essere bloccata dai
// limiti giornaliero/mensile impostati dagli admin.

interface GoogleComponent {
  long_name: string
  short_name: string
  types: string[]
}

function comp(components: GoogleComponent[], type: string): GoogleComponent | undefined {
  return components.find((c) => c.types.includes(type))
}

function toCandidate(r: any): GeocodeCandidate {
  const components: GoogleComponent[] = r.address_components || []
  const country = comp(components, 'country')?.short_name || null
  const route = comp(components, 'route')?.long_name
  const number = comp(components, 'street_number')?.long_name
  const street = route ? [route, number].filter(Boolean).join(' ') : null
  const postalCode = comp(components, 'postal_code')?.long_name || null

  const rawCity =
    comp(components, 'locality')?.long_name ||
    comp(components, 'postal_town')?.long_name ||
    comp(components, 'administrative_area_level_3')?.long_name ||
    null

  let province: string | null = null
  let city: string | null = rawCity
  let cityKnown = false

  if (country === 'IT') {
    const a2 = comp(components, 'administrative_area_level_2')
    province = resolveProvinceSigla(a2?.short_name) || resolveProvinceSigla(a2?.long_name)
    const official = matchItalianCity(province, rawCity)
    if (official) {
      city = official
      cityKnown = true
    }
  } else {
    province = comp(components, 'administrative_area_level_1')?.long_name || null
  }

  return {
    formattedAddress: r.formatted_address || '',
    address: street,
    country,
    province,
    city,
    postalCode,
    cityKnown,
    partialMatch: !!r.partial_match
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canCreate(session, 'client')) return NextResponse.json({ error: 'Utente in sola lettura' }, { status: 403 })

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Verifica indirizzo non configurata (manca la chiave Google). Compila i campi a mano.' },
      { status: 503 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  const country = typeof body.country === 'string' ? body.country.trim().toUpperCase() : ''
  if (address.length < 5) {
    return NextResponse.json({ error: 'Scrivi l\'indirizzo completo (almeno 5 caratteri)' }, { status: 400 })
  }
  if (address.length > 200) {
    return NextResponse.json({ error: 'Indirizzo troppo lungo' }, { status: 400 })
  }

  const reserved = await reserveGeocodeCall()
  if (!reserved.ok) {
    return NextResponse.json(
      {
        error:
          reserved.reason === 'daily'
            ? 'Limite giornaliero di verifiche indirizzo raggiunto. Compila i campi a mano o riprova domani.'
            : 'Limite mensile di verifiche indirizzo raggiunto. Compila i campi a mano.'
      },
      { status: 429 }
    )
  }

  const params = new URLSearchParams({ address, key: apiKey, language: 'it' })
  if (/^[A-Z]{2}$/.test(country)) params.set('components', `country:${country}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, {
      signal: controller.signal,
      cache: 'no-store'
    })
    const data = await res.json()

    if (data.status === 'ZERO_RESULTS') return NextResponse.json({ candidates: [] })
    if (data.status !== 'OK') {
      // Il dettaglio (es. chiave non valida o API non abilitata) resta nei log del server.
      console.error('Geocoding Google: status', data.status, data.error_message || '')
      return NextResponse.json(
        { error: `Il servizio di verifica indirizzo non e' disponibile (${data.status}). Compila i campi a mano.` },
        { status: 502 }
      )
    }

    const candidates = (data.results as any[]).slice(0, 5).map(toCandidate)
    return NextResponse.json({ candidates })
  } catch (e: any) {
    console.error('Geocoding Google: errore di rete', e?.message || e)
    return NextResponse.json(
      { error: 'Servizio di verifica indirizzo non raggiungibile. Compila i campi a mano.' },
      { status: 502 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
