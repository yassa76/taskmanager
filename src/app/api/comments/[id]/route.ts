import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserId, scopeOf } from '@/lib/permissions'
import { extractMentionIds } from '@/lib/commentText'
import { MAX_COMMENT_LENGTH, createNotifications, toCommentDTO } from '@/lib/comments'

// Modifica: solo l'autore.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const existing = await prisma.comment.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Commento non trovato' }, { status: 404 })
  if (existing.authorId !== getUserId(session) || scopeOf(session, 'comment', 'update') === 'none') {
    return NextResponse.json({ error: 'Puoi modificare solo i tuoi commenti' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!text) return NextResponse.json({ error: 'Il commento è vuoto' }, { status: 400 })
  if (text.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: `Commento troppo lungo (massimo ${MAX_COMMENT_LENGTH} caratteri)` }, { status: 400 })
  }

  const updated = await prisma.comment.update({
    where: { id: params.id },
    data: { body: text, editedAt: new Date() },
    include: { author: { select: { id: true, name: true, email: true } } }
  })

  // avvisa solo chi e' stato menzionato per la prima volta con questa modifica
  try {
    const before = new Set(extractMentionIds(existing.body))
    const added = extractMentionIds(text).filter((id) => !before.has(id))
    if (added.length > 0) {
      await createNotifications({ commentId: existing.id, authorId: existing.authorId, mentionIds: added })
    }
  } catch (e) {
    console.error('Errore nella creazione degli avvisi:', e)
  }

  return NextResponse.json(toCommentDTO(updated, session))
}

// Eliminazione: l'autore o un admin.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const existing = await prisma.comment.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Commento non trovato' }, { status: 404 })
  const delScope = scopeOf(session, 'comment', 'delete')
  if (!(delScope === 'all' || (delScope === 'own' && existing.authorId === getUserId(session)))) {
    return NextResponse.json({ error: 'Non puoi eliminare questo commento' }, { status: 403 })
  }

  await prisma.comment.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
