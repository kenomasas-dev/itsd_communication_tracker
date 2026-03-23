const pool = require('./src/config/database');

async function addStatusColumn() {
  try {
    console.log('Adding status column to communications table...');
    
    const result = await pool.query(`
      ALTER TABLE itsd_schema.communications 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
    `);
    
    console.log('✓ Status column added successfully');
    
    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_communications_status 
      ON itsd_schema.communications(status)
    `);
    
    console.log('✓ Index created successfully');
    
    // Check if column was added
    const checkResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'itsd_schema' AND table_name = 'communications' AND column_name = 'status'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✓ Status column verified in database');
    } else {
      console.log('⚠ Status column may already exist');
    }
    
    pool.end();
    process.exit(0);
  } catch (error) {
    if (error.message.includes('column "status" of relation "communications" already exists')) {
      console.log('✓ Status column already exists');
      pool.end();
      process.exit(0);
    } else {
      console.error('Error:', error.message);
      pool.end();
      process.exit(1);
    }
  }
}

addStatusColumn();
