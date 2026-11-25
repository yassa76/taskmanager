import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/permissions'
import { plainBody } from '@/lib/commentText'

// Avvisi dell'utente corrente: contatore dei non letti + ultimi 30.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const userId = getUserId(session)

  const [unread, items] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null, reason: 'menzione' } }),
    prisma.notification.findMany({
      where: { userId, reason: 'menzione' }, // solo menzioni (eventuali avvisi vecchi di altro tipo si ignorano)
      include: { comment: { include: { author: { select: { id: true, name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 30
    })
  ])

  // titoli dei record commentati (una query per tipo)
  const taskIds = Array.from(new Set(items.filter((n) => n.comment.entityType === 'task').map((n) => n.comment.entityId)))
  const subIds = Array.from(new Set(items.filter((n) => n.comment.entityType === 'subtask').map((n) => n.comment.entityId)))
  const [tasks, subs] = await Promise.all([
    taskIds.length ? prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true } }) : [],
    subIds.length ? prisma.subtask.findMany({ where: { id: { in: subIds } }, select: { id: true, title: true } }) : []
  ])
  const titles = new Map<string, string>()
  for (const t of tasks) titles.set(`task:${t.id}`, t.title)
  for (const s of subs) titles.set(`subtask:${s.id}`, s.title)

  return NextResponse.json({
    unread,
    items: items.map((n) => ({
      id: n.id,
      reason: n.reason,
      read: !!n.readAt,
      createdAt: n.createdAt.toISOString(),
      authorName: n.comment.author.name || n.comment.author.email,
      entityType: n.comment.entityType,
      entityId: n.comment.entityId,
      entityTitle: titles.get(`${n.comment.entityType}:${n.comment.entityId}`) ?? null,
      snippet: plainBody(n.comment.body).slice(0, 140)
    }))
  })
}
