import { prisma } from '@/lib/prisma'

/**
 * Limiti di utilizzo del geocoding Google, pensati per restare nella quota
 * gratuita (10.000 richieste al mese per lo SKU Geocoding). Il tetto mensile
 * non puo' mai superare FREE_MONTHLY_CAP, nemmeno se un admin prova a impostarlo.
 */
export const FREE_MONTHLY_CAP = 10000
export const DEFAULT_DAILY_LIMIT = 300
export const DEFAULT_MONTHLY_LIMIT = 9000

const KEY_DAILY = 'geocode.dailyLimit'
const KEY_MONTHLY = 'geocode.monthlyLimit'

// Google azzera le quote giornaliere a mezzanotte (fuso Pacifico) e fattura per
// mese nello stesso fuso: contiamo con lo stesso calendario.
function pacificDay(date = new Date()): { day: string; month: string } {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
  return { day, month: day.slice(0, 7) }
}

function toInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export async function getLimits(): Promise<{ dailyLimit: number; monthlyLimit: number }> {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: [KEY_DAILY, KEY_MONTHLY] } } })
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const monthlyLimit = Math.min(toInt(map.get(KEY_MONTHLY), DEFAULT_MONTHLY_LIMIT), FREE_MONTHLY_CAP)
  const dailyLimit = Math.min(toInt(map.get(KEY_DAILY), DEFAULT_DAILY_LIMIT), monthlyLimit)
  return { dailyLimit, monthlyLimit }
}

export async function saveLimits(dailyLimit: number, monthlyLimit: number): Promise<void> {
  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: KEY_MONTHLY },
      update: { value: String(monthlyLimit) },
      create: { key: KEY_MONTHLY, value: String(monthlyLimit) }
    }),
    prisma.appSetting.upsert({
      where: { key: KEY_DAILY },
      update: { value: String(dailyLimit) },
      create: { key: KEY_DAILY, value: String(dailyLimit) }
    })
  ])
}

export async function getUsage(): Promise<{ usedToday: number; usedMonth: number; day: string; month: string }> {
  const { day, month } = pacificDay()
  const [today, monthSum] = await Promise.all([
    prisma.geocodeUsage.findUnique({ where: { day } }),
    prisma.geocodeUsage.aggregate({ _sum: { count: true }, where: { day: { startsWith: month } } })
  ])
  return { usedToday: today?.count ?? 0, usedMonth: monthSum._sum.count ?? 0, day, month }
}

export type ReserveResult = { ok: true } | { ok: false; reason: 'daily' | 'monthly' }

/**
 * Prenota una chiamata a Google PRIMA di farla. Se un limite e' raggiunto la
 * chiamata non parte. L'incremento giornaliero e' atomico (un solo UPDATE con
 * condizione), cosi' richieste simultanee non possono superare il tetto.
 */
export async function reserveGeocodeCall(): Promise<ReserveResult> {
  const { dailyLimit, monthlyLimit } = await getLimits()
  const { usedMonth, day } = await getUsage()
  if (usedMonth >= monthlyLimit) return { ok: false, reason: 'monthly' }

  await prisma.$executeRaw`INSERT INTO "GeocodeUsage" ("day", "count") VALUES (${day}, 0) ON CONFLICT ("day") DO NOTHING`
  const updated = await prisma.$executeRaw`UPDATE "GeocodeUsage" SET "count" = "count" + 1 WHERE "day" = ${day} AND "count" < ${dailyLimit}`
  if (updated === 0) return { ok: false, reason: 'daily' }
  return { ok: true }
}
