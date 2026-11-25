// Parti della ricorrenza senza dipendenze server: usabili anche nel browser.

export const RECURRENCE_OPTIONS = [
  { value: 'weekly', label: 'Ogni settimana' },
  { value: 'biweekly', label: 'Ogni 2 settimane' },
  { value: 'monthly', label: 'Ogni mese' },
  { value: 'quarterly', label: 'Ogni 3 mesi' },
  { value: 'semiannual', label: 'Ogni 6 mesi' },
  { value: 'yearly', label: 'Ogni anno' }
] as const

export type Recurrence = (typeof RECURRENCE_OPTIONS)[number]['value']

export function isRecurrence(v: unknown): v is Recurrence {
  return RECURRENCE_OPTIONS.some((o) => o.value === v)
}

export function recurrenceLabel(v: string | null | undefined): string {
  return RECURRENCE_OPTIONS.find((o) => o.value === v)?.label ?? ''
}

// Spiegazione mostrata a chi usa la piattaforma (tooltip)
export const RECURRENCE_HELP =
  'Un sub-task ricorrente non si ripete da solo a date fisse: quando lo chiudi (stato "Completato") la piattaforma crea automaticamente il successivo, ' +
  'nello stesso task, con le date di avvio e di scadenza spostate in avanti di un intervallo. Nome, dettagli e owner vengono copiati. ' +
  'Il task padre resta aperto finché la serie continua e la sua scadenza si allunga se il nuovo sub-task scade dopo. ' +
  'La serie si ferma se annulli il sub-task, se il task padre è chiuso o annullato, o se la nuova scadenza supera la data "Ripeti fino al".'

// Testo breve sempre visibile sotto la scelta
export const RECURRENCE_SHORT =
  'Quando chiudi questo sub-task (stato "Completato") ne verrà creato in automatico uno nuovo nello stesso task, con le date spostate in avanti di un intervallo.'

function addMonthsUTC(date: Date, months: number): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + months
  const day = date.getUTCDate()
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate() // ultimo giorno del mese di arrivo
  return new Date(
    Date.UTC(y, m, Math.min(day, lastDay), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds())
  )
}

// Sposta una data in avanti di un intervallo. Per i mesi, il 31 gennaio + 1 mese = 28/29 febbraio.
export function addInterval(date: Date, rec: Recurrence): Date {
  switch (rec) {
    case 'weekly':
      return new Date(date.getTime() + 7 * 86400000)
    case 'biweekly':
      return new Date(date.getTime() + 14 * 86400000)
    case 'monthly':
      return addMonthsUTC(date, 1)
    case 'quarterly':
      return addMonthsUTC(date, 3)
    case 'semiannual':
      return addMonthsUTC(date, 6)
    case 'yearly':
      return addMonthsUTC(date, 12)
  }
}
