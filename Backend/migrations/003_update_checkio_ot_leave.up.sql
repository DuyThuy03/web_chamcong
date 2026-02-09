-- 003_update_checkio_ot_leave.up.sql

-- 1. Updates to CheckIO table
ALTER TABLE CheckIO ADD COLUMN IF NOT EXISTS work_hours NUMERIC(4,2);
ALTER TABLE CheckIO ADD COLUMN IF NOT EXISTS work_unit NUMERIC(3,2);
ALTER TABLE CheckIO ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT TRUE;

-- Migrate existing status ON_TIME to FULL_DAY if necessary to satisfy new constraint
UPDATE CheckIO SET work_status = 'FULL_DAY' WHERE work_status = 'ON_TIME';

ALTER TABLE CheckIO DROP CONSTRAINT IF EXISTS checkio_work_status_check;

ALTER TABLE CheckIO ADD CONSTRAINT checkio_work_status_check
CHECK (work_status IN ('FULL_DAY', 'HALF_DAY', 'LATE', 'ABSENT'));

-- 2. Create Overtime table
CREATE TABLE IF NOT EXISTS overtime (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    day DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_hours NUMERIC(4,2) NOT NULL,
    base_rate NUMERIC(3,2) DEFAULT 1,
    adjusted_rate NUMERIC(3,2),
    adjustment_reason TEXT,
    approved_by INT REFERENCES users(id),
    approved_at TIMESTAMP,
    status TEXT DEFAULT 'CHO_DUYET' CHECK (status IN ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Update LeaveRequest table
ALTER TABLE leaverequest ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT FALSE;
