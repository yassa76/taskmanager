-- La ricorrenza passa dal task al SUB-TASK (la migrazione "recurring-tasks" era sbagliata).
-- 1) Aggiunge le colonne ai sub-task. Solo aggiunte, idempotente.
-- (La pulizia dei campi sui task e' nel file 2026-11-recurring-tasks-cleanup.sql, da eseguire DOPO il merge.)

ALTER TABLE "Subtask" ADD COLUMN IF NOT EXISTS "recurrence"         TEXT;
ALTER TABLE "Subtask" ADD COLUMN IF NOT EXISTS "recurrenceEndDate"  TIMESTAMP(3);
ALTER TABLE "Subtask" ADD COLUMN IF NOT EXISTS "recurrenceSourceId" TEXT;

-- Un sub-task puo' avere al massimo un "successivo": impedisce i doppioni se due
-- persone lo chiudono nello stesso istante.
CREATE UNIQUE INDEX IF NOT EXISTS "Subtask_recurrenceSourceId_key" ON "Subtask" ("recurrenceSourceId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subtask_recurrenceSourceId_fkey') THEN
    ALTER TABLE "Subtask"
      ADD CONSTRAINT "Subtask_recurrenceSourceId_fkey"
      FOREIGN KEY ("recurrenceSourceId") REFERENCES "Subtask"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
