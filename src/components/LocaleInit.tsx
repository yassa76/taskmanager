'use client'

import { setTimeZone } from '@/lib/locale'

// Imposta il fuso/formato dell'utente PRIMA che si disegni il resto della pagina (e' il primo elemento del body).
export default function LocaleInit({ tz }: { tz: string }) {
  setTimeZone(tz)
  return null
}
