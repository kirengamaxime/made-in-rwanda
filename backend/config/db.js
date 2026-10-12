const { Pool, types } = require('pg');
const { databaseUrl } = require('./env');

types.setTypeParser(20, (v) => parseInt(v, 10)); // bigint (counts, sums) -> number
types.setTypeParser(1700, (v) => parseFloat(v)); // numeric -> number

const isLocal = /(@|\/\/)(localhost|127\.0\.0\.1)(:|\/)/.test(databaseUrl);
const ssl = process.env.DATABASE_SSL === 'false' || isLocal ? false : { rejectUnauthorized: false };

const pool = new Pool({ connectionString: databaseUrl, ssl, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 15000 });
pool.on('error', (err) => console.error('[db] idle client error:', err.message));

const query = (text, params) => pool.query(text, params);

// Runs fn(client) inside a transaction; commits on success, rolls back on any error.
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

async function connect() {
  try {
    await pool.query('select 1');
    const t = await pool.query("select to_regclass('public.users') as users");
    console.log('[db] Connected to Postgres');
    if (!t.rows[0].users) console.warn('[db] Tables not found. Run "npm run db:init" (or paste database/schema.sql into the Supabase SQL editor).');
  } catch (err) {
    console.error('[db] Database connection failed:', err.message);
    if (/ENOTFOUND|ENETUNREACH|EHOSTUNREACH/.test(err.message)) console.error('[db] Hint: use the Supabase "Session pooler" connection string (IPv4 compatible), not the direct db.xxx.supabase.co one.');
    if (/password authentication/i.test(err.message)) console.error('[db] Hint: check the password in DATABASE_URL (URL-encode special characters).');
    process.exit(1);
  }
}

module.exports = { pool, query, tx, connect };
