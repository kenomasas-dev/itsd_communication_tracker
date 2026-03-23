-- Add is_active column to login table
ALTER TABLE itsd_schema.login 
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Display the updated table
SELECT * FROM itsd_schema.login;
