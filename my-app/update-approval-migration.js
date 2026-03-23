const pool = require('./src/config/database');

async function updateApprovalColumn() {
    try {
        console.log('Altering approval column in communications table...');

        // Change the default value to 'Not Required'
        await pool.query(`
      ALTER TABLE itsd_schema.communications 
      ALTER COLUMN approval SET DEFAULT 'Not Required'
    `);

        // Update existing rows that have 'unreviewed' to 'Required' 
        // and 'approved' or others as needed. Since I literally just added it, they are likely 'unreviewed'.
        await pool.query(`
      UPDATE itsd_schema.communications 
      SET approval = 'Not Required'
      WHERE approval = 'unreviewed' OR approval IS NULL
    `);

        console.log('✓ Approval column defaults and existing rows successfully updated');

        pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        pool.end();
        process.exit(1);
    }
}

updateApprovalColumn();
