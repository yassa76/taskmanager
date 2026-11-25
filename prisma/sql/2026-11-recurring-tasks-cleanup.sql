-- Da eseguire DOPO il merge della PR sui sub-task ricorrenti (altrimenti il codice in produzione,
-- che legge ancora queste colonne, va in errore). Toglie i campi di ricorrenza dai task:
-- erano stati creati da poco e non sono piu' usati. Eseguire solo se nessun task e' ricorrente:
--   SELECT count(*) FROM "Task" WHERE "recurrence" IS NOT NULL;

ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_recurrenceSourceId_fkey";
DROP INDEX IF EXISTS "Task_recurrenceSourceId_key";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "recurrenceSourceId";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "recurrenceEndDate";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "recurrence";
