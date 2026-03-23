-- Create permissions table for admin
CREATE TABLE IF NOT EXISTS itsd_schema.permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permissions_name ON itsd_schema.permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON itsd_schema.permissions(category);

-- Sample permissions
INSERT INTO itsd_schema.permissions (name, description, category, risk_level, created_by) VALUES
('Read', 'View user information and data', 'User Management', 'Low', 'system'),
('Write', 'Create and edit user data', 'User Management', 'Medium', 'system'),
('Delete', 'Remove user data and accounts', 'User Management', 'High', 'system'),
('Manage Users', 'Full control over user management', 'User Management', 'High', 'system'),
('Manage Roles', 'Create, edit, and delete roles', 'Role Management', 'Critical', 'system'),
('Manage Permissions', 'Assign and revoke permissions', 'Role Management', 'Critical', 'system'),
('View Reports', 'Access system reports and analytics', 'Reporting', 'Low', 'system'),
('Export Data', 'Export data to CSV or other formats', 'Reporting', 'Medium', 'system'),
('View Audit Logs', 'Access and view system audit logs', 'Audit', 'Low', 'system'),
('Create Communication', 'Create new communication records', 'Communication', 'Medium', 'system'),
('Edit Communication', 'Modify existing communication records', 'Communication', 'Medium', 'system'),
('Delete Communication', 'Remove communication records', 'Communication', 'High', 'system'),
('Configure Settings', 'Modify system configuration and settings', 'System', 'Critical', 'system'),
('Manage Integrations', 'Add and configure third-party integrations', 'System', 'High', 'system')
ON CONFLICT DO NOTHING;

-- Quick verify
SELECT id, name, category, risk_level, created_at FROM itsd_schema.permissions ORDER BY id LIMIT 20;
