const pool = require('./src/config/database');

async function addApprovalColumn() {
    try {
        console.log('Adding approval column to communications table...');

        await pool.query(`
      ALTER TABLE itsd_schema.communications 
      ADD COLUMN IF NOT EXISTS approval VARCHAR(50) DEFAULT 'unreviewed'
    `);

        console.log('✓ Approval column added successfully');

        // Create index
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_communications_approval 
      ON itsd_schema.communications(approval)
    `);

        console.log('✓ Index created successfully');

        pool.end();
        process.exit(0);
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('✓ Approval column already exists');
            pool.end();
            process.exit(0);
        } else {
            console.error('Error:', error.message);
            pool.end();
            process.exit(1);
        }
    }
}

addApprovalColumn();
