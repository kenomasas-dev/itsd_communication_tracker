-- Create groups table for admin
CREATE TABLE IF NOT EXISTS itsd_schema.groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    members_count INT DEFAULT 0,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_groups_name ON itsd_schema.groups(name);

-- Create group members junction table
CREATE TABLE IF NOT EXISTS itsd_schema.group_members (
    id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES itsd_schema.groups(id) ON DELETE CASCADE,
    user_id INT NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50),
    added_by VARCHAR(255),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON itsd_schema.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON itsd_schema.group_members(user_id);

-- Sample groups
INSERT INTO itsd_schema.groups (name, description, created_by) VALUES
('Development Team', 'Software development and engineering team', 'system'),
('Marketing Team', 'Marketing and communications team', 'system'),
('Sales Team', 'Sales and business development team', 'system'),
('Operations Team', 'Operations and support team', 'system')
ON CONFLICT DO NOTHING;

-- Quick verify
SELECT id, name, description, members_count, created_at FROM itsd_schema.groups ORDER BY id LIMIT 10;
