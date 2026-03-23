-- Recreate groups table with assigned_to and members columns
BEGIN;

-- Drop existing group_members first (FK dependency)
DROP TABLE IF EXISTS itsd_schema.group_members CASCADE;

-- Drop existing groups table
DROP TABLE IF EXISTS itsd_schema.groups CASCADE;

-- Create groups table with new schema
CREATE TABLE itsd_schema.groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    assigned_to VARCHAR(255),
    members JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    members_count INT DEFAULT 0,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_groups_name ON itsd_schema.groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_assigned_to ON itsd_schema.groups(assigned_to);

-- Create group members junction table
CREATE TABLE itsd_schema.group_members (
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

COMMIT;

-- Verify
SELECT 'Groups table created successfully' as status;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name='groups' AND table_schema='itsd_schema' 
ORDER BY ordinal_position;
