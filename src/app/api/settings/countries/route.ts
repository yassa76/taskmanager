import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManage } from '@/lib/permissions'
import { getCountriesWithUsage, getCountryCodes, saveCountryCodes } from '@/lib/countries'
import { isValidCountryCode } from '@/lib/geoShared'

// Elenco dei paesi selezionabili: lo leggono tutti (serve al menu del cliente).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  return NextResponse.json({ countries: await getCountriesWithUsage() })
}

// Aggiunge ({ add: "FR" }) o toglie ({ remove: "FR" }) un paese: solo admin.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canManage(session, 'settings')) return NextResponse.json({ error: 'Solo gli admin possono modificare i paesi' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const codes = await getCountryCodes()

  if (typeof body.add === 'string') {
    const code = body.add.toUpperCase()
    if (!isValidCountryCode(code)) return NextResponse.json({ error: 'Paese non valido' }, { status: 400 })
    if (!codes.includes(code)) await saveCountryCodes([...codes, code])
  } else if (typeof body.remove === 'string') {
    const code = body.remove.toUpperCase()
    if (code === 'IT') {
      return NextResponse.json({ error: "L'Italia non si può togliere: provincia e comune dipendono da lei" }, { status: 400 })
    }
    const current = await getCountriesWithUsage()
    const found = current.find((c) => c.code === code)
    if (found && found.inUse > 0) {
      return NextResponse.json(
        { error: `${found.label} è usato da ${found.inUse} ${found.inUse === 1 ? 'cliente' : 'clienti'}: cambia prima il loro paese` },
        { status: 409 }
      )
    }
    await saveCountryCodes(codes.filter((c) => c !== code))
  } else {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })
  }

  return NextResponse.json({ countries: await getCountriesWithUsage() })
}
