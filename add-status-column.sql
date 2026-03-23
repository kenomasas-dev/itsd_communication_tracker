-- Add status column to communications table
ALTER TABLE itsd_schema.communications 
ADD COLUMN status VARCHAR(50) DEFAULT 'pending';

-- Update existing records to have pending status
UPDATE itsd_schema.communications 
SET status = 'pending' 
WHERE status IS NULL;

-- Create index for status queries
CREATE INDEX idx_communications_status ON itsd_schema.communications(status);
