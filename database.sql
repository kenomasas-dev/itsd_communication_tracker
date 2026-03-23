-- Create ITSD Database with Login Table in Schema
-- Run this file with: psql -U postgres -d itsd -f database.sql

CREATE SCHEMA IF NOT EXISTS itsd_schema;

CREATE TABLE IF NOT EXISTS itsd_schema.login (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Viewer',
    department VARCHAR(100),
    phone VARCHAR(20),
    notes TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Communications Table
CREATE TABLE IF NOT EXISTS itsd_schema.communications (
    id SERIAL PRIMARY KEY,
    direction VARCHAR(50) NOT NULL,
    kind_of_communication VARCHAR(100) NOT NULL,
    type_of_communication VARCHAR(100) NOT NULL,
    communication_date DATE NOT NULL,
    organization VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    received_by VARCHAR(100),
    assigned_to VARCHAR(100),
    tags VARCHAR(255),
    follow_up_required BOOLEAN DEFAULT FALSE,
    priority_level VARCHAR(20),
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO itsd_schema.login (name, email, password, role, department, phone, notes, permissions) VALUES
    ('Admin User', 'admin@itsd.com', 'password123', 'Admin', 'Engineering', '123-456-7890', 'Admin account', '["Read", "Write", "Delete", "Full"]'::jsonb),
    ('Regular User', 'user@itsd.com', 'password456', 'User', 'Marketing', '123-456-7891', 'Regular user', '["Read", "Write"]'::jsonb),
    ('Staff Member', 'staff@itsd.com', 'password789', 'Viewer', 'Sales', '123-456-7892', 'Staff account', '["Read"]'::jsonb)
ON CONFLICT (email) DO NOTHING;

-- Display the tables
SELECT * FROM itsd_schema.login;
SELECT * FROM itsd_schema.communications;

