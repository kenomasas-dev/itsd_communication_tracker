-- Add status column to message table
ALTER TABLE itsd_schema.message
ADD COLUMN status VARCHAR(50) DEFAULT 'draft';

-- Optionally update existing records to have a default status
UPDATE itsd_schema.message SET status = 'draft' WHERE status IS NULL;
