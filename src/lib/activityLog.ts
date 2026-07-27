import { prisma } from './prisma'

export type ActivityEntityType = 'task' | 'subtask' | 'client'
export type ActivityAction = 'creato' | 'stato' | 'owner' | 'eliminato'

/**
 * Scrive una riga nel log attivita'. Non blocca mai l'operazione principale:
 * se il log fallisce per qualsiasi motivo, l'errore viene solo loggato in
 * console, non propagato (un task deve potersi salvare anche se il log no).
 */
export async function logActivity(params: {
  entityType: ActivityEntityType
  entityId: string
  action: ActivityAction
  detail?: string | null
  entityLabel?: string | null
  userId?: string | null
}) {
  try {
    await prisma.activityLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        detail: params.detail ?? null,
        entityLabel: params.entityLabel ?? null,
        userId: params.userId ?? null
      }
    })
  } catch (e) {
    console.error('Errore nello scrivere il log attivita:', e)
  }
}
