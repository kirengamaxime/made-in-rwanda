require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n[config] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[config] Copy .env.example to .env and fill in the values.\n');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 16) {
  console.error('[config] JWT_SECRET must be at least 16 characters long.');
  process.exit(1);
}

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const useSupabaseStorage = !!(supabaseUrl && supabaseKey && !/YOURPROJECTREF/.test(supabaseUrl));

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  storage: useSupabaseStorage ? 'supabase' : 'local',
  supabaseUrl,
  supabaseKey,
  supabaseBucket: process.env.SUPABASE_BUCKET || 'made-in-rwanda',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'simulated',
  maxImageSizeMb: 5,
};
