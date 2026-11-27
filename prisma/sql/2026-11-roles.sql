-- Ruoli personalizzati con permessi per oggetto. Solo aggiunte, idempotente.

CREATE TABLE IF NOT EXISTS "Role" (
  "id"          TEXT PRIMARY KEY,
  "key"         TEXT NOT NULL UNIQUE,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "isSystem"    BOOLEAN NOT NULL DEFAULT false,
  "permissions" TEXT NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- I tre ruoli di sempre, con le stesse regole di prima (User.role continua a contenere la chiave del ruolo).
INSERT INTO "Role" ("id","key","name","description","isSystem","permissions")
VALUES ('role_admin','admin','Admin','Accesso completo e gestione del sistema',true,'{"task":{"create":"all","update":"all","delete":"all"},"subtask":{"create":"all","update":"all","delete":"all"},"client":{"create":"all","update":"all","delete":"all"},"comment":{"create":"all","update":"own","delete":"all"},"notification":{"delete":"all"}}')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "Role" ("id","key","name","description","isSystem","permissions")
VALUES ('role_normal','normal','Normale','Crea; modifica ed elimina solo i propri record',true,'{"task":{"create":"all","update":"own","delete":"own"},"subtask":{"create":"all","update":"own","delete":"own"},"client":{"create":"all","update":"own","delete":"own"},"comment":{"create":"all","update":"own","delete":"own"},"notification":{"delete":"none"}}')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "Role" ("id","key","name","description","isSystem","permissions")
VALUES ('role_read_only','read_only','Sola lettura','Solo consultazione (può commentare)',true,'{"task":{"create":"none","update":"none","delete":"none"},"subtask":{"create":"none","update":"none","delete":"none"},"client":{"create":"none","update":"none","delete":"none"},"comment":{"create":"all","update":"own","delete":"own"},"notification":{"delete":"none"}}')
ON CONFLICT ("key") DO NOTHING;

-- Come le altre tabelle dell'app: RLS attiva, accesso solo dal server.
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
