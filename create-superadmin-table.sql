-- Create superadmin table for a dedicated superadmin account
CREATE TABLE IF NOT EXISTS itsd_schema.superadmin (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert fixed superadmin credentials (replace with hashed password for production!)
INSERT INTO itsd_schema.superadmin (username, password)
VALUES ('superadmin', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- Optional: verify inserted row
SELECT * FROM itsd_schema.superadmin;
