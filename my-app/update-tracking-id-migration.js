const pool = require('./src/config/database');

async function addTrackingId() {
    try {
        console.log('Adding tracking_id column to tables...');

        for (const table of ['itsd_schema.communications', 'itsd_schema.approval']) {
            await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(50);`);

            const res = await pool.query(`SELECT id, communication_date, created_at FROM ${table} WHERE tracking_id IS NULL`);
            for (const row of res.rows) {
                const year = new Date(row.communication_date || row.created_at || Date.now()).getFullYear();
                const rand = Math.floor(100000 + Math.random() * 900000);
                const trackingId = `ITSD-${year}-${rand}`;
                await pool.query(`UPDATE ${table} SET tracking_id = $1 WHERE id = $2`, [trackingId, row.id]);
            }

            await pool.query(`ALTER TABLE ${table} ADD UNIQUE (tracking_id);`).catch(e => {
                if (!e.message.includes('already exists')) {
                    console.error(e.message);
                }
            });
            console.log(`✓ Updated tracking_ids for ${table}`);
        }

        pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        pool.end();
        process.exit(1);
    }
}

addTrackingId();
