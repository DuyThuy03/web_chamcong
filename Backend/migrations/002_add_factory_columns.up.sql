ALTER TABLE CheckIO ADD COLUMN IF NOT EXISTS checkin_type TEXT DEFAULT 'OFFICE';
ALTER TABLE CheckIO ADD COLUMN IF NOT EXISTS factory_name TEXT;
ALTER TABLE CheckIO ADD COLUMN IF NOT EXISTS note TEXT;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_checkio_checkin_type') THEN 
        ALTER TABLE CheckIO ADD CONSTRAINT ck_checkio_checkin_type CHECK (checkin_type IN ('OFFICE', 'FACTORY'));
    END IF;
END $$;
