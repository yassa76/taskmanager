// Tipi di avviso e preferenze: parti senza dipendenze server, usabili anche nel browser.

export const OTHER_NOTIFICATION_TYPES = [
  { key: 'assegnato', label: 'Mi viene assegnato un task o un sub-task' },
  { key: 'scadenza_cambiata', label: 'Cambia la scadenza di un mio task o sub-task (fatta da un altro)' },
  { key: 'in_scadenza', label: 'Un mio sub-task sta per scadere o è in ritardo' }
] as const

export type OtherNotificationType = (typeof OTHER_NOTIFICATION_TYPES)[number]['key']
export type NotificationPrefs = Record<OtherNotificationType, boolean>

export const DEFAULT_PREFS: NotificationPrefs = { assegnato: true, scadenza_cambiata: true, in_scadenza: true }

// Le menzioni non si possono disattivare: sono la priorita'.
export function parsePrefs(raw: string | null | undefined): NotificationPrefs {
  const prefs = { ...DEFAULT_PREFS }
  if (!raw) return prefs
  try {
    const obj = JSON.parse(raw)
    for (const t of OTHER_NOTIFICATION_TYPES) {
      if (typeof obj?.[t.key] === 'boolean') prefs[t.key] = obj[t.key]
    }
  } catch {}
  return prefs
}
