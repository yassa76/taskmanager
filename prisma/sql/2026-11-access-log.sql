-- Registro accessi + ultima attivita' degli utenti. Solo aggiunte, idempotente.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "AccessLog" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AccessLog_createdAt_idx" ON "AccessLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "AccessLog_userId_createdAt_idx" ON "AccessLog" ("userId", "createdAt");

-- Come le altre tabelle dell'app: RLS attiva, accesso solo dal server.
ALTER TABLE "AccessLog" ENABLE ROW LEVEL SECURITY;
