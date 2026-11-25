'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { getInitials } from '@/lib/initials'
import { MENTION_RE, plainBody, splitBody } from '@/lib/commentText'

interface CommentDTO {
  id: string
  body: string
  authorId: string
  authorName: string
  createdAt: string
  editedAt: string | null
  canEdit: boolean
  canDelete: boolean
}

interface Member {
  id: string
  name: string
  email: string
}

const MAX_LEN = 4000

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Testo scritto dall'utente (@Nome) -> testo salvato (@[Nome](id))
function toStored(text: string, mentions: Record<string, string>): string {
  let out = text
  const names = Object.keys(mentions).sort((a, b) => b.length - a.length)
  for (const name of names) {
    const re = new RegExp(`@${escapeRe(name)}(?![A-Za-z0-9À-ÿ])`, 'g')
    out = out.replace(re, `@[${name}](${mentions[name]})`)
  }
  return out
}

function mentionsFromStored(body: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const m of Array.from(body.matchAll(MENTION_RE))) map[m[1]] = m[2]
  return map
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
}

function CommentInput({
  members,
  initialStored,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel
}: {
  members: Member[]
  initialStored?: string
  placeholder: string
  submitLabel: string
  onSubmit: (stored: string) => Promise<string | null> // ritorna un messaggio d'errore oppure null
  onCancel?: () => void
}) {
  const [text, setText] = useState(initialStored ? plainBody(initialStored) : '')
  const [mentions, setMentions] = useState<Record<string, string>>(initialStored ? mentionsFromStored(initialStored) : {})
  const [query, setQuery] = useState<{ start: number; q: string } | null>(null)
  const [active, setActive] = useState(0)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  const suggestions = useMemo(() => {
    if (!query) return []
    const q = query.q.toLowerCase()
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6)
  }, [query, members])

  function detect(value: string, caret: number) {
    const before = value.slice(0, caret)
    const m = before.match(/(?:^|\s)@([^@\n]{0,30})$/)
    if (m) {
      setQuery({ start: caret - m[1].length - 1, q: m[1] })
      setActive(0)
    } else {
      setQuery(null)
    }
  }

  function pick(member: Member) {
    if (!query) return
    const el = ref.current
    const caret = el ? el.selectionStart : text.length
    const next = text.slice(0, query.start) + `@${member.name} ` + text.slice(caret)
    setText(next)
    setMentions((prev) => ({ ...prev, [member.name]: member.id }))
    setQuery(null)
    requestAnimationFrame(() => {
      if (!el) return
      const pos = query.start + member.name.length + 2
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setError(null)
    const err = await onSubmit(toStored(trimmed, mentions))
    setSending(false)
    if (err) setError(err)
    else {
      setText('')
      setMentions({})
    }
  }

  return (
    <div>
      <textarea
        ref={ref}
        value={text}
        maxLength={MAX_LEN}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value)
          detect(e.target.value, e.target.selectionStart)
        }}
        onClick={(e) => detect(text, e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => (a + 1) % suggestions.length)
              return
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => (a - 1 + suggestions.length) % suggestions.length)
              return
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault()
              pick(suggestions[active])
              return
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              setQuery(null)
              return
            }
          }
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            submit()
          }
        }}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
      />
      {/* elenco in-flow (non assoluto) per non farsi tagliare dai contenitori */}
      {suggestions.length > 0 && (
        <ul className="mt-1 border border-slate-200 rounded-lg bg-white shadow-sm divide-y divide-slate-50 text-sm">
          {suggestions.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(m)
                }}
                className={`w-full text-left px-3 py-1.5 ${i === active ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50'}`}
              >
                @{m.name}
                {members.some((o) => o.id !== m.id && o.name === m.name) && (
                  <span className="ml-2 text-xs text-slate-400">{m.email}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between mt-2 gap-3">
        <p className="text-xs text-slate-400">
          Scrivi <span className="font-mono">@</span> per menzionare un collega: riceverà un avviso sulla campanella. Ctrl/Cmd+Invio per inviare.
        </p>
        <div className="flex gap-2 shrink-0">
          {onCancel && (
            <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
              Annulla
            </button>
          )}
          <button
            onClick={submit}
            disabled={sending || !text.trim()}
            className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {sending ? 'Invio...' : submitLabel}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export default function CommentsPanel({
  entityType,
  entityId
}: {
  entityType: 'task' | 'subtask'
  entityId: string
}) {
  const [comments, setComments] = useState<CommentDTO[] | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    const r = await fetch(`/api/comments?entityType=${entityType}&entityId=${entityId}`)
    if (r.ok) setComments(await r.json())
    else setComments([])
  }

  useEffect(() => {
    load()
    fetch('/api/team')
      .then((r) => (r.ok ? r.json() : []))
      .then((team: any[]) =>
        setMembers(
          team
            .filter((t) => t.status !== 'inactive' && t.matchedUser)
            .map((t) => ({ id: t.matchedUser.id as string, name: (t.matchedUser.name || t.email) as string, email: t.email as string }))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      )
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId])

  async function create(stored: string): Promise<string | null> {
    const r = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, body: stored })
    })
    if (!r.ok) return (await r.json().catch(() => ({}))).error || 'Errore nell\'invio del commento'
    await load()
    return null
  }

  async function edit(id: string, stored: string): Promise<string | null> {
    const r = await fetch(`/api/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: stored })
    })
    if (!r.ok) return (await r.json().catch(() => ({}))).error || 'Errore nel salvataggio'
    setEditingId(null)
    await load()
    return null
  }

  async function remove(id: string) {
    if (!confirm('Eliminare questo commento?')) return
    const r = await fetch(`/api/comments/${id}`, { method: 'DELETE' })
    if (!r.ok) alert((await r.json().catch(() => ({}))).error || 'Errore nell\'eliminazione')
    await load()
  }

  return (
    <div id="commenti" className="bg-white border border-slate-200 rounded-xl shadow-sm mt-6 scroll-mt-20">
      <div className="px-5 py-3 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">
          Commenti {comments && comments.length > 0 && <span className="text-slate-400 font-normal">({comments.length})</span>}
        </h2>
      </div>

      <div className="divide-y divide-slate-50">
        {!comments && <p className="px-5 py-4 text-sm text-slate-400">Caricamento...</p>}
        {comments && comments.length === 0 && (
          <p className="px-5 py-4 text-sm text-slate-400">Nessun commento ancora. Scrivi il primo qui sotto.</p>
        )}
        {comments?.map((c) => (
          <div key={c.id} className="px-5 py-3 flex items-start gap-3 text-sm">
            <Link
              href={`/owners/${c.authorId}`}
              className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0 hover:bg-brand-100"
              title={c.authorName}
            >
              {getInitials(c.authorName)}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                <span className="font-medium text-slate-700 text-sm">{c.authorName}</span>
                <span>{formatWhen(c.createdAt)}</span>
                {c.editedAt && <span title={formatWhen(c.editedAt)}>(modificato)</span>}
                {(c.canEdit || c.canDelete) && editingId !== c.id && (
                  <span className="ml-auto flex gap-3">
                    {c.canEdit && (
                      <button onClick={() => setEditingId(c.id)} className="hover:text-brand-600">
                        Modifica
                      </button>
                    )}
                    {c.canDelete && (
                      <button onClick={() => remove(c.id)} className="hover:text-red-600">
                        Elimina
                      </button>
                    )}
                  </span>
                )}
              </div>
              {editingId === c.id ? (
                <div className="mt-2">
                  <CommentInput
                    members={members}
                    initialStored={c.body}
                    placeholder="Modifica il commento..."
                    submitLabel="Salva"
                    onSubmit={(stored) => edit(c.id, stored)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <p className="mt-1 text-slate-700 whitespace-pre-wrap break-words">
                  {splitBody(c.body).map((p, i) =>
                    p.type === 'mention' ? (
                      <Link
                        key={i}
                        href={`/owners/${p.userId}`}
                        className="text-brand-600 font-medium bg-brand-50 rounded px-1 hover:underline"
                      >
                        @{p.name}
                      </Link>
                    ) : (
                      <span key={i}>{p.text}</span>
                    )
                  )}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Visibile e usabile da tutti, anche dagli utenti in sola lettura */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
        <CommentInput members={members} placeholder="Scrivi un commento..." submitLabel="Commenta" onSubmit={create} />
      </div>
    </div>
  )
}
