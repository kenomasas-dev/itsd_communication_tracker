-- Alter login table to add user management columns
ALTER TABLE itsd_schema.login ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE itsd_schema.login ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Viewer';
ALTER TABLE itsd_schema.login ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE itsd_schema.login ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE itsd_schema.login ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE itsd_schema.login ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Update existing records with default values
UPDATE itsd_schema.login SET 
  name = COALESCE(name, email),
  role = COALESCE(role, 'Viewer'),
  department = COALESCE(department, 'General'),
  permissions = COALESCE(permissions, '["Read"]'::jsonb)
WHERE name IS NULL;

-- Display updated table structure
\d itsd_schema.login

-- Display sample data
SELECT * FROM itsd_schema.login;
