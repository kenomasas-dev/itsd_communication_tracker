-- Migration: add assigned_to and members JSON column to groups (non-destructive)
BEGIN;

ALTER TABLE IF EXISTS itsd_schema.groups
  ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255),
  ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_groups_assigned_to ON itsd_schema.groups(assigned_to);

COMMIT;

-- Notes:
-- - `assigned_to` stores the string entered in the "Assigned To" field in the modal.
-- - `members` stores an array of member names as JSON (e.g. ["Alice","Bob"]).
-- - This migration is intentionally non-destructive and does not rename or drop
--   existing columns. If you later want to populate `members` from
--   `itsd_schema.group_members`, I can add an optional conversion step.
