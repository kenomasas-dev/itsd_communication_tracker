-- Create userlogin table mirroring adminlogin structure
CREATE TABLE IF NOT EXISTS itsd_schema.userlogin (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'User',
    department VARCHAR(100),
    phone VARCHAR(20),
    notes TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes to speed up common lookups
CREATE INDEX IF NOT EXISTS idx_userlogin_email ON itsd_schema.userlogin(email);
CREATE INDEX IF NOT EXISTS idx_userlogin_is_active ON itsd_schema.userlogin(is_active);

-- Optional sample user (won't overwrite existing email)
INSERT INTO itsd_schema.userlogin (name, email, password, role, department, phone, notes, permissions, is_active) VALUES
    ('Sample User', 'user@example.com', 'password123', 'User', 'General', '000-000-0000', 'Sample account', '[]'::jsonb, true)
ON CONFLICT (email) DO NOTHING;

-- Show created rows for verification
SELECT * FROM itsd_schema.userlogin;
