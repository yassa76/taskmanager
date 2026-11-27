import { prisma } from './prisma'
import { getUserId, scopeOf } from './permissions'

export type CommentEntityType = 'task' | 'subtask'

export function isEntityType(v: unknown): v is CommentEntityType {
  return v === 'task' || v === 'subtask'
}

// Titolo e owner del record commentato (null se non esiste).
export async function getEntityInfo(entityType: CommentEntityType, entityId: string) {
  if (entityType === 'task') {
    const t = await prisma.task.findUnique({ where: { id: entityId }, select: { title: true, ownerId: true } })
    return t ? { title: t.title, ownerIds: [t.ownerId] } : null
  }
  const s = await prisma.subtask.findUnique({
    where: { id: entityId },
    select: { title: true, ownerId: true, task: { select: { ownerId: true } } }
  })
  return s ? { title: s.title, ownerIds: [s.ownerId, s.task.ownerId] } : null
}

/**
 * Crea gli avvisi (campanella) per le menzioni di un commento: uno per ogni persona menzionata.
 * Chi scrive non avvisa mai se stesso. Commentare il task di cui si e' owner NON genera avvisi:
 * la campanella e' solo per le menzioni. In modifica si passano solo le menzioni nuove.
 */
export async function createNotifications(params: {
  commentId: string
  authorId: string
  mentionIds: string[]
}) {
  const ids = Array.from(new Set(params.mentionIds)).filter((id) => id !== params.authorId)
  if (ids.length === 0) return
  const valid = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } })
  if (valid.length === 0) return
  await prisma.notification.createMany({
    data: valid.map((u) => ({ userId: u.id, commentId: params.commentId, reason: 'menzione' }))
  })
}

export const MAX_COMMENT_LENGTH = 4000

export function toCommentDTO(
  c: { id: string; authorId: string; body: string; createdAt: Date; editedAt: Date | null; author: { id: string; name: string | null; email: string } },
  session: any
) {
  const me = getUserId(session)
  return {
    id: c.id,
    body: c.body,
    authorId: c.authorId,
    authorName: c.author.name || c.author.email,
    createdAt: c.createdAt.toISOString(),
    editedAt: c.editedAt ? c.editedAt.toISOString() : null,
    canEdit: scopeOf(session, 'comment', 'update') !== 'none' && c.authorId === me,
    canDelete: scopeOf(session, 'comment', 'delete') === 'all' || (scopeOf(session, 'comment', 'delete') === 'own' && c.authorId === me)
  }
}
