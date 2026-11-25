import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/permissions'
import { plainBody } from '@/lib/commentText'

// Avvisi dell'utente corrente, in due gruppi: "menzioni" (priorita') e "altro".
// ?kind=menzioni|altro  &page=1  &pageSize=10 (max 50)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const userId = getUserId(session)

  const { searchParams } = new URL(req.url)
  const kind = searchParams.get('kind') === 'altro' ? 'altro' : 'menzioni'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10) || 10))

  const mention = { reason: 'menzione' }
  const other = { reason: { not: 'menzione' } }
  const where = { userId, ...(kind === 'menzioni' ? mention : other) }

  const [unreadMentions, unreadOther, total, items] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null, ...mention } }),
    prisma.notification.count({ where: { userId, readAt: null, ...other } }),
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      include: { comment: { include: { author: { select: { id: true, name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ])

  // titoli dei record (una query per tipo): per le menzioni arrivano dal commento, per gli altri avvisi dall'avviso stesso
  const refOf = (n: (typeof items)[number]) =>
    n.comment ? { type: n.comment.entityType, id: n.comment.entityId } : { type: n.entityType, id: n.entityId }
  const taskIds = Array.from(new Set(items.filter((n) => refOf(n).type === 'task').map((n) => refOf(n).id!)))
  const subIds = Array.from(new Set(items.filter((n) => refOf(n).type === 'subtask').map((n) => refOf(n).id!)))
  const [tasks, subs] = await Promise.all([
    taskIds.length ? prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true } }) : [],
    subIds.length ? prisma.subtask.findMany({ where: { id: { in: subIds } }, select: { id: true, title: true } }) : []
  ])
  const titles = new Map<string, string>()
  for (const t of tasks) titles.set(`task:${t.id}`, t.title)
  for (const s of subs) titles.set(`subtask:${s.id}`, s.title)

  return NextResponse.json({
    unreadMentions,
    unreadOther,
    total,
    page,
    pageSize,
    items: items
      .map((n) => {
        const ref = refOf(n)
        if (!ref.type || !ref.id) return null // avviso senza oggetto: non mostrabile
        return {
          id: n.id,
          reason: n.reason,
          read: !!n.readAt,
          createdAt: n.createdAt.toISOString(),
          authorName: n.comment ? n.comment.author.name || n.comment.author.email : null,
          entityType: ref.type,
          entityId: ref.id,
          entityTitle: titles.get(`${ref.type}:${ref.id}`) ?? null,
          snippet: n.comment ? plainBody(n.comment.body).slice(0, 140) : null,
          message: n.message
        }
      })
      .filter(Boolean)
  })
}
