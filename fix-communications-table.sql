-- Run this in PostgreSQL to create the communications table
CREATE TABLE IF NOT EXISTS itsd_schema.communications (
    id SERIAL PRIMARY KEY,
    direction VARCHAR(50) NOT NULL,
    kind_of_communication VARCHAR(100) NOT NULL,
    type_of_communication VARCHAR(100) NOT NULL,
    communication_date DATE NOT NULL,
    organization VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    received_by VARCHAR(100),
    assigned_to VARCHAR(100),
    tags VARCHAR(255),
    follow_up_required BOOLEAN DEFAULT FALSE,
    priority_level VARCHAR(20),
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verify table was created
SELECT * FROM information_schema.tables WHERE table_schema = 'itsd_schema' AND table_name = 'communications';
