-- migrations/001_initial_schema.up.sql

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: department
CREATE TABLE IF NOT EXISTS department (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    leader_id INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: shift
CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    late_after_min INT DEFAULT 15,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id  SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    date_of_birth DATE,
    address TEXT,
    gender TEXT CHECK (gender IN ('Nam', 'Nữ', 'Khác')),
    phone_number TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Nhân viên', 'Trưởng phòng', 'Quản lý', 'Giám đốc')),
    department_id INT REFERENCES department(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Hoạt động' CHECK (status IN ('Hoạt động', 'Không hoạt động')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: LeaveRequest
CREATE TABLE IF NOT EXISTS LeaveRequest (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('NGHI_PHEP', 'DI_MUON')),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    session TEXT CHECK (session IN ('SANG', 'CHIEU', 'CA_NGAY')),
    expected_arrival_time TIME,
    reason TEXT,
    status TEXT DEFAULT 'CHO_DUYET' CHECK (status IN ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI')),
    approved_by_id INT REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: CheckIO
CREATE TABLE IF NOT EXISTS CheckIO (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    checkin_time TIMESTAMP,
    checkout_time TIMESTAMP,
    checkin_image TEXT,
    checkout_image TEXT,
    checkin_latitude DECIMAL(10,7),
    checkin_longitude DECIMAL(10,7),
    checkout_latitude DECIMAL(10,7),
    checkout_longitude DECIMAL(10,7),
    checkin_address TEXT,
    checkout_address TEXT,
    device TEXT,
    shift_id INT REFERENCES shifts(id) ON DELETE SET NULL,
    work_status TEXT CHECK (work_status IN ('ON_TIME', 'LATE', 'ABSENT')),
    leave_status TEXT DEFAULT 'NONE' CHECK (leave_status IN ('NONE', 'APPROVED')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, day)
);

-- Add foreign key for department leader
ALTER TABLE department 
ADD CONSTRAINT fk_department_leader 
FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_checkio_user_day ON CheckIO(user_id, day);
CREATE INDEX idx_checkio_day ON CheckIO(day);
CREATE INDEX idx_leaverequest_user ON LeaveRequest(user_id);
CREATE INDEX idx_leaverequest_status ON LeaveRequest(status);

-- Insert sample data
INSERT INTO shifts (name, start_time, end_time, late_after_min) VALUES
('Sáng', '08:00:00', '12:00:00', 15),
('Chiều', '13:00:00', '17:30:00', 15),
('Tăng ca', '18:00:00', '22:00:00', 30);

-- Insert sample department
INSERT INTO department (name) VALUES
('Phòng R&D'),
('Phòng Kinh doanh'),
('Phòng tự động hóa');

-- Insert sample users (password is 'password123' hashed with bcrypt)
-- Note: In production, use proper password hashing
INSERT INTO users (name, email, password, role, department_id, status) VALUES
('Giám đốc A', 'director@company.com', '$2a$10$YourHashedPasswordHere', 'Giám đốc', NULL, 'Hoạt động'),
('Quản lý B', 'manager@company.com', '$2a$10$YourHashedPasswordHere', 'Quản lý', 1, 'Hoạt động'),
('Trưởng phòng C', 'leader@company.com', '$2a$10$YourHashedPasswordHere', 'Trưởng phòng', 1, 'Hoạt động'),
('Nhân viên D', 'thuy@a.com', '123', 'Nhân viên', 1, 'Hoạt động');

-- Update department leader
UPDATE department SET leader_id = 3 WHERE id = 1;

-- Create view for attendance summary
CREATE OR REPLACE VIEW attendance_summary AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.department_id,
    d.name as department_name,
    DATE_TRUNC('month', c.day) as month,
    COUNT(*) as total_days,
    SUM(CASE WHEN c.work_status = 'ON_TIME' THEN 1 ELSE 0 END) as on_time_days,
    SUM(CASE WHEN c.work_status = 'LATE' THEN 1 ELSE 0 END) as late_days,
    SUM(CASE WHEN c.work_status = 'ABSENT' THEN 1 ELSE 0 END) as absent_days
FROM users u
LEFT JOIN CheckIO c ON u.id = c.user_id
LEFT JOIN department d ON u.department_id = d.id
GROUP BY u.id, u.name, u.department_id, d.name, DATE_TRUNC('month', c.day);