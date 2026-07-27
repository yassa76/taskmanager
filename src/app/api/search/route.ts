import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface SearchResultItem {
  id: string
  title: string
  subtitle?: string
}

interface SearchableEntity {
  type: string
  label: string
  href: (id: string) => string
  search: (q: string) => Promise<SearchResultItem[]>
}

// Registro delle entità cercabili: per aggiungerne una nuova in futuro basta
// aggiungere una voce qui, senza toccare il resto della route né il
// componente della barra di ricerca.
const ENTITIES: SearchableEntity[] = [
  {
    type: 'task',
    label: 'Task',
    href: (id) => `/tasks/${id}`,
    search: async (q) => {
      const rows = await prisma.task.findMany({
        where: { title: { contains: q, mode: 'insensitive' } },
        select: { id: true, title: true, client: { select: { name: true } } },
        take: 6
      })
      return rows.map((r) => ({ id: r.id, title: r.title, subtitle: r.client?.name ?? undefined }))
    }
  },
  {
    type: 'subtask',
    label: 'Sub-task',
    href: (id) => `/subtasks/${id}`,
    search: async (q) => {
      const rows = await prisma.subtask.findMany({
        where: { title: { contains: q, mode: 'insensitive' } },
        select: { id: true, title: true, task: { select: { title: true } } },
        take: 6
      })
      return rows.map((r) => ({ id: r.id, title: r.title, subtitle: r.task?.title }))
    }
  },
  {
    type: 'client',
    label: 'Clienti',
    href: (id) => `/clients/${id}`,
    search: async (q) => {
      const rows = await prisma.client.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, industry: true },
        take: 6
      })
      return rows.map((r) => ({ id: r.id, title: r.name, subtitle: r.industry ?? undefined }))
    }
  },
  {
    type: 'person',
    label: 'Persone',
    href: (id) => `/owners/${id}`,
    search: async (q) => {
      const rows = await prisma.user.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, email: true },
        take: 6
      })
      return rows.map((r) => ({ id: r.id, title: r.name || r.email, subtitle: r.email }))
    }
  }
]

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  if (q.length < 3) return NextResponse.json({ groups: [] })

  const groups = await Promise.all(
    ENTITIES.map(async (entity) => ({
      type: entity.type,
      label: entity.label,
      items: (await entity.search(q)).map((item) => ({ ...item, href: entity.href(item.id) }))
    }))
  )

  return NextResponse.json({ groups: groups.filter((g) => g.items.length > 0) })
}
