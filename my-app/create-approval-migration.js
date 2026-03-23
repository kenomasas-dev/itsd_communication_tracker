const pool = require('./src/config/database');

async function createApprovalTable() {
    try {
        console.log('Creating approval table in database...');

        await pool.query(`
      CREATE TABLE IF NOT EXISTS itsd_schema.approval (
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
        status VARCHAR(50) DEFAULT 'pending_approval',
        approval VARCHAR(50) DEFAULT 'Required',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log('✓ Approval table successfully created');

        pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        pool.end();
        process.exit(1);
    }
}

createApprovalTable();
