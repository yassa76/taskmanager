import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLog'
import { spawnNextRecurrence } from '@/lib/recurrence'

// Chiamato quando l'utente conferma "Sì, chiudi anche il task padre"
// dopo che tutti i sotto-task sono stati completati.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const confirm = body?.confirm !== false // default true

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { subtasks: true }
  })
  if (!task) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })

  const allCompleted = task.subtasks.length > 0 && task.subtasks.every((s) => s.status === 'completato')
  if (!allCompleted) {
    return NextResponse.json(
      { error: 'Non tutti i sotto-task sono completati' },
      { status: 400 }
    )
  }

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: { closedManually: confirm }
  })

  if (confirm) {
    await logActivity({
      entityType: 'task',
      entityId: task.id,
      action: 'stato',
      entityLabel: task.title,
      detail: 'Chiuso manualmente (tutti i sotto-task completati)',
      userId: (session.user as any).id
    })
  }

  // Chiudere il task padre puo' far nascere il successivo, se e' ricorrente
  const next = confirm ? await spawnNextRecurrence(task.id, (session.user as any).id) : null
  return NextResponse.json({ ...updated, nextRecurrence: next ? { id: next.id } : null })
}
