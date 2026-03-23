-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS itsd_schema.audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON itsd_schema.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON itsd_schema.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON itsd_schema.audit_logs(user_email);

-- Insert sample audit logs for testing
INSERT INTO itsd_schema.audit_logs (action, user_email, user_role, description) VALUES
('USER_CREATED', 'admin@itsd.com', 'Admin', 'Created user: John Doe'),
('LOGIN', 'user@itsd.com', 'User', 'User logged in from 192.168.1.100'),
('USER_UPDATED', 'admin@itsd.com', 'Admin', 'Updated user permissions for jane@company.com'),
('ROLE_CHANGED', 'admin@itsd.com', 'Admin', 'Changed role from Viewer to Manager'),
('LOGIN', 'admin@itsd.com', 'Admin', 'Admin logged in'),
('USER_CREATED', 'admin@itsd.com', 'Admin', 'Created user: Jane Smith'),
('PERMISSION_CHANGED', 'admin@itsd.com', 'Admin', 'Granted Read, Write permissions'),
('LOGIN', 'staff@itsd.com', 'Staff', 'Staff member logged in'),
('USER_DELETED', 'admin@itsd.com', 'Admin', 'Deleted inactive user account'),
('LOGOUT', 'user@itsd.com', 'User', 'User logged out');

-- Verify the table
SELECT * FROM itsd_schema.audit_logs ORDER BY created_at DESC LIMIT 10;
