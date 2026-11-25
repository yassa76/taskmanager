import { prisma } from './prisma'
import { parsePrefs, type OtherNotificationType } from './notifyShared'

const MERGE_WINDOW_MS = 60 * 60 * 1000 // cambi ripetuti sulla stessa scadenza in un'ora: una riga sola
const DEADLINE_SOON_DAYS = 3

function itDate(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Rome' })
}

/**
 * Crea un avviso (non menzione) per `userId`, rispettando le sue preferenze.
 * Chi fa l'azione non avvisa mai se stesso.
 */
export async function notifyUser(params: {
  userId: string
  actorId?: string | null
  reason: OtherNotificationType
  entityType: 'task' | 'subtask'
  entityId: string
  message: string
  dedupeKey?: string
  mergeRecent?: boolean
}) {
  try {
    if (params.actorId && params.actorId === params.userId) return
    const user = await prisma.user.findUnique({ where: { id: params.userId }, select: { notificationPrefs: true } })
    if (!user) return
    if (!parsePrefs(user.notificationPrefs)[params.reason]) return

    if (params.dedupeKey) {
      const exists = await prisma.notification.findFirst({
        where: { userId: params.userId, dedupeKey: params.dedupeKey },
        select: { id: true }
      })
      if (exists) return
    }

    if (params.mergeRecent) {
      const recent = await prisma.notification.findFirst({
        where: {
          userId: params.userId,
          reason: params.reason,
          entityType: params.entityType,
          entityId: params.entityId,
          readAt: null,
          createdAt: { gte: new Date(Date.now() - MERGE_WINDOW_MS) }
        },
        select: { id: true }
      })
      if (recent) {
        await prisma.notification.update({
          where: { id: recent.id },
          data: { message: params.message, createdAt: new Date() }
        })
        return
      }
    }

    await prisma.notification.create({
      data: {
        userId: params.userId,
        reason: params.reason,
        entityType: params.entityType,
        entityId: params.entityId,
        message: params.message,
        dedupeKey: params.dedupeKey ?? null
      }
    })
  } catch (e) {
    console.error('Creazione avviso non riuscita', e)
  }
}

/** Avvisa tutti gli admin che una persona ha chiesto di accedere (una volta sola per richiesta). */
export async function notifyAdminsAccessRequest(memberId: string, who: string) {
  try {
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
    for (const a of admins) {
      const key = `access_request:${memberId}`
      const exists = await prisma.notification.findFirst({ where: { userId: a.id, dedupeKey: key }, select: { id: true } })
      if (exists) continue
      await prisma.notification.create({
        data: {
          userId: a.id,
          reason: 'richiesta_accesso',
          entityType: 'team',
          entityId: memberId,
          message: `${who} ha chiesto di accedere alla piattaforma: approva o rifiuta dalla pagina Team`,
          dedupeKey: key
        }
      })
    }
  } catch (e) {
    console.error('Avviso richiesta accesso non riuscito', e)
  }
}

export async function actorName(actorId: string | null | undefined): Promise<string> {
  if (!actorId) return 'Qualcuno'
  const u = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true, email: true } })
  return u ? u.name || u.email : 'Qualcuno'
}

export function assignedMessage(actor: string, kind: 'task' | 'subtask', title: string) {
  return `${actor} ti ha assegnato il ${kind === 'task' ? 'task' : 'sub-task'} «${title}»`
}

export function deadlineChangedMessage(actor: string, kind: 'task' | 'subtask', title: string, from: Date | null, to: Date | null) {
  return `${actor} ha cambiato la scadenza del tuo ${kind === 'task' ? 'task' : 'sub-task'} «${title}»: ${
    from ? itDate(from) : '—'
  } → ${to ? itDate(to) : '—'}`
}

/**
 * Avvisa dei sub-task dell'utente in scadenza (entro 3 giorni) o in ritardo. Gira al massimo una volta
 * al giorno per persona, quando apre l'app; ogni scadenza viene avvisata una volta sola
 * (se la scadenza cambia, e' una scadenza nuova).
 */
export async function ensureDeadlineNotifications(userId: string) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const key = `deadlinecheck.${userId}`
    const last = await prisma.appSetting.findUnique({ where: { key } })
    if (last?.value === today) return
    await prisma.appSetting.upsert({ where: { key }, update: { value: today }, create: { key, value: today } })

    const now = new Date()
    const limit = new Date(now.getTime() + DEADLINE_SOON_DAYS * 24 * 60 * 60 * 1000)
    const subs = await prisma.subtask.findMany({
      where: {
        ownerId: userId,
        status: { in: ['da_avviare', 'in_corso'] },
        endDate: { not: null, lte: limit }
      },
      select: { id: true, title: true, endDate: true },
      take: 50
    })
    for (const s of subs) {
      const end = s.endDate as Date
      const days = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      const message =
        end < now
          ? `Il sub-task «${s.title}» è in ritardo: scadeva il ${itDate(end)}`
          : days <= 0
          ? `Il sub-task «${s.title}» scade oggi`
          : days === 1
          ? `Il sub-task «${s.title}» scade domani`
          : `Il sub-task «${s.title}» scade tra ${days} giorni (${itDate(end)})`
      await notifyUser({
        userId,
        reason: 'in_scadenza',
        entityType: 'subtask',
        entityId: s.id,
        message,
        dedupeKey: `in_scadenza:${s.id}:${end.toISOString().slice(0, 10)}`
      })
    }
  } catch (e) {
    console.error('Controllo scadenze non riuscito', e)
  }
}
