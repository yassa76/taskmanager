import { prisma } from './prisma'

// Per quanti giorni si conservano il registro accessi e quello delle modifiche.
// Oltre questa soglia le righe vengono cancellate in automatico.
export const RETENTION_OPTIONS = [30, 90, 180, 365]
export const DEFAULT_RETENTION_DAYS = 90

const KEYS = { access: 'retention.accessDays', activity: 'retention.activityDays' } as const
const KEY_LAST_CLEANUP = 'retention.lastCleanup'
export type RetentionKind = keyof typeof KEYS

function valid(n: number): boolean {
  return RETENTION_OPTIONS.includes(n)
}

export async function getRetention(): Promise<{ access: number; activity: number }> {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: Object.values(KEYS) } } })
  const map = new Map(rows.map((r) => [r.key, Number.parseInt(r.value, 10)]))
  const get = (k: string) => {
    const n = map.get(k)
    return n !== undefined && valid(n) ? n : DEFAULT_RETENTION_DAYS
  }
  return { access: get(KEYS.access), activity: get(KEYS.activity) }
}

export async function setRetention(kind: RetentionKind, days: number): Promise<boolean> {
  if (!valid(days)) return false
  const value = String(days)
  await prisma.appSetting.upsert({
    where: { key: KEYS[kind] },
    update: { value },
    create: { key: KEYS[kind], value }
  })
  return true
}

/**
 * Cancella le righe piu' vecchie della soglia. Non c'e' un job schedulato: la pulizia parte
 * da sola al login o all'attivita' di un utente, al massimo una volta al giorno.
 */
export async function runCleanupIfDue(): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const last = await prisma.appSetting.findUnique({ where: { key: KEY_LAST_CLEANUP } })
    if (last?.value === today) return
    // si "prenota" il giorno subito, cosi' piu' richieste insieme non fanno la pulizia piu' volte
    await prisma.appSetting.upsert({
      where: { key: KEY_LAST_CLEANUP },
      update: { value: today },
      create: { key: KEY_LAST_CLEANUP, value: today }
    })
    const { access, activity } = await getRetention()
    const cutoff = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    await prisma.accessLog.deleteMany({ where: { createdAt: { lt: cutoff(access) } } })
    await prisma.activityLog.deleteMany({ where: { createdAt: { lt: cutoff(activity) } } })
  } catch (e) {
    console.error('Pulizia registri non riuscita', e)
  }
}
