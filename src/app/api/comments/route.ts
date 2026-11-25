import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/permissions'
import { extractMentionIds } from '@/lib/commentText'
import { MAX_COMMENT_LENGTH, createNotifications, getEntityInfo, isEntityType, toCommentDTO } from '@/lib/comments'

// Elenco commenti di un task o sub-task (dal piu' vecchio al piu' recente).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entityType')
  const entityId = searchParams.get('entityId')
  if (!isEntityType(entityType) || !entityId) {
    return NextResponse.json({ error: 'entityType e entityId sono obbligatori' }, { status: 400 })
  }

  const comments = await prisma.comment.findMany({
    where: { entityType, entityId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' }
  })
  return NextResponse.json(comments.map((c) => toCommentDTO(c, session)))
}

// Nuovo commento. Possono scriverlo tutti gli utenti autenticati, anche in sola lettura.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { entityType, entityId } = body
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!isEntityType(entityType) || typeof entityId !== 'string' || !entityId) {
    return NextResponse.json({ error: 'entityType e entityId sono obbligatori' }, { status: 400 })
  }
  if (!text) return NextResponse.json({ error: 'Il commento è vuoto' }, { status: 400 })
  if (text.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: `Commento troppo lungo (massimo ${MAX_COMMENT_LENGTH} caratteri)` }, { status: 400 })
  }

  const info = await getEntityInfo(entityType, entityId)
  if (!info) return NextResponse.json({ error: 'Record non trovato' }, { status: 404 })

  const authorId = getUserId(session)
  const created = await prisma.comment.create({
    data: { entityType, entityId, authorId, body: text },
    include: { author: { select: { id: true, name: true, email: true } } }
  })

  try {
    await createNotifications({
      commentId: created.id,
      authorId,
      entityType,
      entityId,
      mentionIds: extractMentionIds(text),
      ownerIds: info.ownerIds
    })
  } catch (e) {
    // gli avvisi non devono impedire di salvare il commento
    console.error('Errore nella creazione degli avvisi:', e)
  }

  return NextResponse.json(toCommentDTO(created, session), { status: 201 })
}
