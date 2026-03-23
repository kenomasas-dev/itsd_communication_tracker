-- Migration: create_assignedto_table
-- Creates a table to store assignees used by the Assigned To dropdown
CREATE SCHEMA IF NOT EXISTS itsd_schema;

CREATE TABLE IF NOT EXISTS itsd_schema.assigned_to (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample assignees (safe to run multiple times)
INSERT INTO itsd_schema.assigned_to (name) VALUES
  ('Aldrin Constantino'),
  ('Jenny Rose Navarra'),
  ('Imelda Badili')
ON CONFLICT (name) DO NOTHING;

-- Notes:
-- - The frontend currently posts a string `assignedTo`; consider sending an `assigned_to_id`
--   and updating the communications table to reference `itsd_schema.assigned_to(id)` for referential integrity.
