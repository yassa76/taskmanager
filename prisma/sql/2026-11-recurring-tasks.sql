-- Task ricorrenti. Solo aggiunte: non modifica ne' elimina dati esistenti. Idempotente.
-- I task gia' esistenti restano "singoli" (recurrence = NULL).

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "recurrence"         TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "recurrenceEndDate"  TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "recurrenceSourceId" TEXT;

-- Un task puo' avere al massimo un "successivo": impedisce i doppioni se due
-- persone chiudono lo stesso task nello stesso istante.
CREATE UNIQUE INDEX IF NOT EXISTS "Task_recurrenceSourceId_key" ON "Task" ("recurrenceSourceId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_recurrenceSourceId_fkey') THEN
    ALTER TABLE "Task"
      ADD CONSTRAINT "Task_recurrenceSourceId_fkey"
      FOREIGN KEY ("recurrenceSourceId") REFERENCES "Task"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
