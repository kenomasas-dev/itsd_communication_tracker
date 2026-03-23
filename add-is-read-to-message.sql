-- Add is_read column to message table
ALTER TABLE itsd_schema.message
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;
