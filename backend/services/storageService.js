/**
 * Image storage abstraction. The database only ever stores URL strings.
 *  - Supabase Storage (when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set): public bucket, public URLs.
 *  - Local disk fallback (development): backend/uploads, served at /uploads/<file>.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { storage, supabaseUrl, supabaseKey, supabaseBucket } = require('../config/env');

// --- Sanitize env values: strip whitespace and any non-ASCII bytes that
// would break HTTP header/URL construction later (e.g. a stray "→" pasted
// into .env). Also strip a trailing slash so we can join paths safely.
const clean = (v = '') =>
  String(v)
    .replace(/[^\x20-\x7E]/g, '') // remove any non-ASCII printable char
    .trim()
    .replace(/\/+$/, '');

const SB_URL = clean(supabaseUrl);
const SB_KEY = clean(supabaseKey);
const SB_BUCKET = clean(supabaseBucket);

// Only actually use Supabase if we have all three values.
const useSupabase = storage === 'supabase' && SB_URL && SB_KEY && SB_BUCKET;

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const PUBLIC_PREFIX = useSupabase
  ? `${SB_URL}/storage/v1/object/public/${SB_BUCKET}/`
  : '';

let client = null;
const supabase = () => {
  if (!client) {
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(SB_URL, SB_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
};

// Verify the real file signature, not just the client-supplied mimetype.
const detectType = (buf) => {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (
    buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'png';
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'webp';
  return null;
};
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// Creates the public bucket on first start if it does not exist yet.
async function ensureBucket() {
  if (!useSupabase) return;
  try {
    const { data, error } = await supabase().storage.getBucket(SB_BUCKET);
    if (data) return;
    if (error && !/not found/i.test(error.message)) {
      console.warn('[storage] Could not check bucket:', error.message);
      return;
    }
    const created = await supabase().storage.createBucket(SB_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: Object.values(MIME),
    });
    if (created.error && !/already exists/i.test(created.error.message)) {
      console.warn('[storage] Could not create bucket:', created.error.message);
    } else {
      console.log(`[storage] Supabase bucket "${SB_BUCKET}" ready`);
    }
  } catch (err) {
    // Never let storage setup crash the server.
    console.warn('[storage] Bucket setup skipped:', err.message);
  }
}

const saveLocal = async (file, type) => {
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${type}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), file.buffer);
  return `/uploads/${name}`;
};

const saveSupabase = async (file, type, folder) => {
  const key = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${type}`;
  const { error } = await supabase()
    .storage.from(SB_BUCKET)
    .upload(key, file.buffer, {
      contentType: MIME[type],
      cacheControl: '31536000',
      upsert: false,
    });
  if (error) throw new AppError(`Image upload failed: ${error.message}`, 502);
  return `${PUBLIC_PREFIX}${key}`;
};

async function saveImages(files = [], folder = 'misc') {
  const urls = [];
  try {
    for (const file of files) {
      const type = detectType(file.buffer);
      if (!type) {
        throw new AppError(
          `"${file.originalname}" is not a valid JPG, PNG or WEBP image.`,
          400
        );
      }
      urls.push(
        useSupabase
          ? await saveSupabase(file, type, folder)
          : await saveLocal(file, type)
      );
    }
  } catch (err) {
    await deleteImages(urls);
    throw err;
  }
  return urls;
}

async function deleteImages(urls = []) {
  const remote = [];
  await Promise.all(
    urls.filter(Boolean).map(async (url) => {
      try {
        if (url.startsWith('/uploads/') && !url.startsWith('/uploads/seed/')) {
          const full = path.resolve(UPLOAD_DIR, url.replace('/uploads/', ''));
          if (full.startsWith(UPLOAD_DIR + path.sep)) {
            await fs.promises.unlink(full);
          }
        } else if (useSupabase && url.startsWith(PUBLIC_PREFIX)) {
          remote.push(url.slice(PUBLIC_PREFIX.length));
        }
      } catch (e) {
        /* best effort cleanup */
      }
    })
  );
  if (remote.length) {
    try {
      await supabase().storage.from(SB_BUCKET).remove(remote);
    } catch (e) {
      /* best effort */
    }
  }
}

module.exports = { saveImages, deleteImages, ensureBucket };