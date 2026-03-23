-- Create themes table to store color themes for the app
-- Uses the itsd_schema schema (matches other migration files in this repo)

CREATE TABLE IF NOT EXISTS itsd_schema.themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color_hex VARCHAR(7) NOT NULL CHECK (color_hex ~ '^#([A-Fa-f0-9]{6})$'),
    color_rgb VARCHAR(32), -- optional: "r,g,b" string if you prefer
    metadata JSONB DEFAULT '{}'::jsonb, -- optional extra info (e.g. contrast, notes)
    uploaded_by VARCHAR(255), -- adjust to a user id column if you have a users table
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_themes_name ON itsd_schema.themes(name);
CREATE INDEX IF NOT EXISTS idx_themes_is_active ON itsd_schema.themes(is_active);

-- Sample insert (optional)
-- INSERT INTO itsd_schema.themes (name, color_hex, color_rgb, uploaded_by)
-- VALUES ('Default Primary', '#7c3aed', '124,58,237', 'system')
-- ON CONFLICT DO NOTHING;

-- To apply: run this file against your Postgres database that contains the itsd_schema schema.
