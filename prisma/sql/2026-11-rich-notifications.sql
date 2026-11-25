-- Notifiche ricche: oltre alle menzioni (legate a un commento) anche assegnazioni e scadenze.
-- Solo estensioni, idempotente. Le notifiche esistenti restano valide.

ALTER TABLE "Notification" ALTER COLUMN "commentId" DROP NOT NULL;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityId"   TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "message"    TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "dedupeKey"  TEXT;
CREATE INDEX IF NOT EXISTS "Notification_userId_dedupeKey_idx" ON "Notification" ("userId", "dedupeKey");

-- Preferenze di notifica di ciascun utente (JSON; vuoto = tutto attivo).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notificationPrefs" TEXT;
