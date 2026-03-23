-- Create roles table for admin
CREATE SCHEMA IF NOT EXISTS itsd_schema;

CREATE TABLE IF NOT EXISTS itsd_schema.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON itsd_schema.roles(name);

-- Sample roles
INSERT INTO itsd_schema.roles (name, description, permissions, created_by) VALUES
('Admin', 'Full administrative access', '["users:create","users:update","roles:manage","audit:view"]', 'system')
ON CONFLICT DO NOTHING;

INSERT INTO itsd_schema.roles (name, description, permissions, created_by) VALUES
('Staff', 'Regular staff member with limited permissions', '["communications:create","communications:view"]', 'system')
ON CONFLICT DO NOTHING;

INSERT INTO itsd_schema.roles (name, description, permissions, created_by) VALUES
('Viewer', 'Read-only access', '["communications:view"]', 'system')
ON CONFLICT DO NOTHING;

-- Quick verify
SELECT id, name, description, created_at FROM itsd_schema.roles ORDER BY id LIMIT 10;