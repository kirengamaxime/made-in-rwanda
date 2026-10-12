/** Creates all tables in the database from database/schema.sql.  Usage: npm run db:init */
const fs = require('fs');
const path = require('path');
require('../config/env');
const { pool } = require('../config/db');

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('[db:init] Schema applied successfully.');
  } catch (err) {
    console.error('[db:init] Failed:', err.message);
    if (/ENOTFOUND|ENETUNREACH/.test(err.message)) console.error('Hint: use the Supabase "Session pooler" connection string in DATABASE_URL.');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
