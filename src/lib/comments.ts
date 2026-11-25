import { prisma } from './prisma'
import { getRole, getUserId } from './permissions'

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
 * Crea gli avvisi per un commento. Destinatari:
 *  - utenti menzionati (motivo "menzione")
 *  - owner del record (e del task padre per un sub-task) -> "owner"
 *  - chi ha gia' commentato in questo record -> "thread"
 * L'autore non riceve mai avvisi; ognuno ne riceve al massimo uno (la menzione ha la priorita').
 * Con `onlyMentionIds` (modifica di un commento) si avvisano solo le nuove menzioni.
 */
export async function createNotifications(params: {
  commentId: string
  authorId: string
  entityType: CommentEntityType
  entityId: string
  mentionIds: string[]
  ownerIds: string[]
  onlyMentions?: boolean
}) {
  const reasons = new Map<string, string>()
  const valid = params.mentionIds.length
    ? await prisma.user.findMany({ where: { id: { in: params.mentionIds } }, select: { id: true } })
    : []
  for (const u of valid) reasons.set(u.id, 'menzione')

  if (!params.onlyMentions) {
    for (const id of params.ownerIds) if (!reasons.has(id)) reasons.set(id, 'owner')
    const prior = await prisma.comment.findMany({
      where: { entityType: params.entityType, entityId: params.entityId },
      select: { authorId: true },
      distinct: ['authorId']
    })
    for (const c of prior) if (!reasons.has(c.authorId)) reasons.set(c.authorId, 'thread')
  }
  reasons.delete(params.authorId)
  if (reasons.size === 0) return
  await prisma.notification.createMany({
    data: Array.from(reasons, ([userId, reason]) => ({ userId, commentId: params.commentId, reason }))
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
    canEdit: c.authorId === me,
    canDelete: c.authorId === me || getRole(session) === 'admin'
  }
}
