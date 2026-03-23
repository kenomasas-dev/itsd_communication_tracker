-- Create adminlogin table for admin users only
CREATE TABLE IF NOT EXISTS itsd_schema.adminlogin (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Admin' CHECK (role = 'Admin'),
    department VARCHAR(100),
    phone VARCHAR(20),
    notes TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_adminlogin_email ON itsd_schema.adminlogin(email);
CREATE INDEX IF NOT EXISTS idx_adminlogin_is_active ON itsd_schema.adminlogin(is_active);

-- Insert sample admin user (optional)
INSERT INTO itsd_schema.adminlogin (name, email, password, role, department, phone, notes, permissions, is_active) VALUES
    ('Super Admin', 'superadmin@itsd.com', 'password123', 'Admin', 'IT', '123-456-7890', 'Super admin account', '["Full Access", "User Management", "Audit Logs"]'::jsonb, true)
ON CONFLICT (email) DO NOTHING;

-- Display the table
SELECT * FROM itsd_schema.adminlogin;
