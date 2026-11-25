-- Commenti su task/sub-task con menzioni e notifiche in-app.
-- Solo aggiunte: non modifica ne' elimina dati esistenti. Idempotente.

CREATE TABLE IF NOT EXISTS "Comment" (
  "id"         TEXT PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId"   TEXT NOT NULL,
  "authorId"   TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "body"       TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "editedAt"   TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "Comment_entityType_entityId_createdAt_idx"
  ON "Comment" ("entityType", "entityId", "createdAt");

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "commentId" TEXT NOT NULL REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "reason"    TEXT NOT NULL,
  "readAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_createdAt_idx"
  ON "Notification" ("userId", "readAt", "createdAt");

-- Come le altre tabelle dell'app: RLS attiva, accesso solo dal server.
ALTER TABLE "Comment"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
