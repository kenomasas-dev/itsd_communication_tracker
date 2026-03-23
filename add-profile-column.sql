-- Add profile column to userlogin and login tables for storing profile image paths
ALTER TABLE itsd_schema.userlogin 
ADD COLUMN IF NOT EXISTS profile VARCHAR(500);

ALTER TABLE itsd_schema.login 
ADD COLUMN IF NOT EXISTS profile VARCHAR(500);

ALTER TABLE itsd_schema.adminlogin 
ADD COLUMN IF NOT EXISTS profile VARCHAR(500);

-- Verify the columns were added
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'itsd_schema' AND table_name IN ('userlogin', 'login', 'adminlogin') 
AND column_name = 'profile'
ORDER BY table_name;
