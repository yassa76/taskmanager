-- Ruoli aziendali ad albero (gerarchia) per la visibilita' dei record. Solo aggiunte, idempotente.

CREATE TABLE IF NOT EXISTS "OrgRole" (
  "id"               TEXT PRIMARY KEY,
  "name"             TEXT NOT NULL,
  "description"      TEXT,
  "parentId"         TEXT REFERENCES "OrgRole"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "taskVisibility"   TEXT NOT NULL DEFAULT 'own_and_below',
  "clientVisibility" TEXT NOT NULL DEFAULT 'all',
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "OrgRole_parentId_idx" ON "OrgRole" ("parentId");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "orgRoleId" TEXT REFERENCES "OrgRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "User_orgRoleId_idx" ON "User" ("orgRoleId");

-- Come le altre tabelle dell'app: RLS attiva, accesso solo dal server.
ALTER TABLE "OrgRole" ENABLE ROW LEVEL SECURITY;
