-- Posizione geografica dei clienti + contatore/impostazioni per il geocoding.
-- Solo aggiunte: non modifica ne' elimina dati esistenti. Idempotente.

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "address"  TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "country"  TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "province" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "city"     TEXT;

CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key"       TEXT PRIMARY KEY,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "GeocodeUsage" (
  "day"   TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 0
);

-- Come le altre tabelle dell'app: RLS attiva, accesso solo dal server.
ALTER TABLE "AppSetting"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeocodeUsage" ENABLE ROW LEVEL SECURITY;
