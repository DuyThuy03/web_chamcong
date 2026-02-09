CREATE TABLE IF NOT EXISTS attendance_edit_history (
    id SERIAL PRIMARY KEY,
    checkin_id INT NOT NULL REFERENCES CheckIO(id) ON DELETE CASCADE,
    editor_id INT NOT NULL REFERENCES users(id),
    old_values JSONB NOT NULL,
    new_values JSONB NOT NULL,
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attendance_edit_history_checkin ON attendance_edit_history(checkin_id);
