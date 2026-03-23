-- Create Approval Table to hold communications that need Head Approval
CREATE TABLE IF NOT EXISTS itsd_schema.approval (
    id SERIAL PRIMARY KEY,
    tracking_id VARCHAR(50) UNIQUE,
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
    status VARCHAR(50) DEFAULT 'pending_approval',
    approval VARCHAR(50) DEFAULT 'Required',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
