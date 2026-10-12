/**
 * Seed script:  npm run seed         (adds missing data, never overwrites existing accounts)
 *               npm run seed:reset   (WIPES all marketplace data first)
 * Passwords come from .env (SEED_*). Blank ones are generated randomly and printed ONCE here.
 */
const fs = require('fs');
const path = require('path');
require('../config/env');
const { pool, query } = require('../config/db');
const users = require('../models/users');
const generatePassword = require('./generatePassword');

const SEED_DIR = path.join(__dirname, '..', 'uploads', 'seed');
const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Local SVG placeholder art (imigongo-inspired) so the demo needs no internet.
// Served by the API at /uploads/seed/... in every storage mode.
function makeImage(slug, label, emoji, [c1, c2, c3], variant = 0) {
  fs.mkdirSync(SEED_DIR, { recursive: true });
  const file = `${slug}-${variant}.svg`;
  const pattern = variant === 0
    ? `<path d="M0 400 L100 300 L200 400 L300 300 L400 400 L500 300 L600 400 V600 H0Z" fill="${c3}" opacity=".35"/>`
    : `<circle cx="480" cy="140" r="170" fill="${c3}" opacity=".35"/><circle cx="480" cy="140" r="100" fill="${c2}" opacity=".35"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/>${pattern}<text x="300" y="330" font-size="190" text-anchor="middle">${emoji}</text><text x="300" y="500" font-size="34" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#fff">${label.replace(/&/g, '&amp;')}</text></svg>`;
  fs.writeFileSync(path.join(SEED_DIR, file), svg);
  return `/uploads/seed/${file}`;
}

const CATEGORIES = [
  ['Fashion', '👗', 'Kitenge, tailored garments and footwear', ['Women', 'Men', 'Kids', 'Footwear']],
  ['Handmade Crafts', '🧺', 'Agaseke baskets, weaving and pottery', ['Baskets', 'Pottery', 'Woodwork', 'Jewellery']],
  ['Agriculture', '🌱', 'Fresh produce and farm goods', ['Fruit', 'Vegetables', 'Seeds', 'Livestock']],
  ['Beauty', '🧴', 'Natural skincare and body care', ['Skincare', 'Hair', 'Fragrance']],
  ['Food', '☕', 'Coffee, tea, honey and local foods', ['Coffee', 'Tea', 'Honey', 'Snacks']],
  ['Art', '🎨', 'Imigongo paintings and original artwork', ['Paintings', 'Prints', 'Sculpture']],
  ['Home Decor', '🏡', 'Rugs, cushions and decorative pieces', ['Rugs', 'Cushions', 'Wall Art']],
  ['Electronics', '🔌', 'Locally assembled gadgets and accessories', ['Solar', 'Audio', 'Accessories']],
  ['Accessories', '👜', 'Bags, belts and leather goods', ['Bags', 'Belts', 'Scarves']],
  ['Other', '✨', 'Everything else made in Rwanda', []],
];

const SELLERS = [
  { name: 'Mukamana Claire', email: 'baskets@example.rw', phone: '0788000001', business: 'Kigali Basket Weavers', category: 'Handmade Crafts', location: 'Kimironko, Gasabo, Kigali', district: 'Gasabo', sector: 'Kimironko', about: 'A women-led cooperative weaving traditional agaseke baskets and modern home pieces in Kigali.', colors: ['#20603D', '#00A1DE', '#FAD201'] },
  { name: 'Uwase Diane', email: 'fashion@example.rw', phone: '0728000002', business: 'Inzozi Fashion House', category: 'Fashion', location: 'Nyarugenge, Kigali', district: 'Nyarugenge', sector: 'Nyarugenge', about: 'Contemporary African fashion tailored in Kigali using kitenge and locally woven fabrics.', colors: ['#00A1DE', '#20603D', '#FAD201'] },
  { name: 'Habimana Jean Paul', email: 'coffee@example.rw', phone: '0798000003', business: 'Volcanoes Coffee Co-op', category: 'Food', location: 'Musanze, Northern Province', district: 'Musanze', sector: 'Muhoza', about: 'Smallholder farmers near the Virunga volcanoes producing specialty coffee, honey and tea.', colors: ['#6b3f1d', '#20603D', '#FAD201'] },
];

const PRODUCTS = [
  [0, 'Handmade Agaseke Basket (Large)', 'Handmade Crafts', 'Baskets', 25000, 20, '🧺', 'Traditional Rwandan peace basket woven from sisal and sweetgrass by hand. Each pattern is unique and takes about three days to complete.'],
  [0, 'Woven Wall Plate Set (3 pcs)', 'Home Decor', 'Wall Art', 18000, 15, '🍽️', 'A set of three woven wall plates in natural and indigo tones. Light, durable and ready to hang.'],
  [0, 'Sisal Storage Basket with Lid', 'Handmade Crafts', 'Baskets', 15000, 30, '🧺', 'Tightly woven lidded basket for storage. Perfect for the living room or bathroom.'],
  [0, 'Imigongo Geometric Painting', 'Art', 'Paintings', 45000, 6, '🎨', 'Hand-crafted imigongo art using cow-dung relief and natural pigments in the traditional black, white and red palette.'],
  [1, 'Kitenge Wrap Dress', 'Fashion', 'Women', 38000, 12, '👗', 'Tailored wrap dress in vibrant kitenge fabric with an adjustable waist tie. Made to order in Kigali.'],
  [1, "Men's Kitenge Shirt", 'Fashion', 'Men', 28000, 18, '👔', 'Slim-fit short sleeve shirt with a bold kitenge print and contrast collar.'],
  [1, 'Leather & Kitenge Tote Bag', 'Accessories', 'Bags', 32000, 10, '👜', 'Spacious tote combining genuine leather straps with kitenge panels. Fits a 15" laptop.'],
  [1, 'Beaded Statement Necklace', 'Handmade Crafts', 'Jewellery', 12000, 25, '📿', 'Hand-beaded necklace in the colours of the Rwandan flag. Lightweight and adjustable.'],
  [2, 'Rwandan Specialty Coffee 1kg (Whole Bean)', 'Food', 'Coffee', 12000, 60, '☕', 'Bourbon variety, washed process, grown at 1,900m near the Virunga volcanoes. Notes of red fruit and caramel.'],
  [2, 'Pure Forest Honey 500g', 'Food', 'Honey', 8000, 40, '🍯', 'Raw, unfiltered honey harvested from Nyungwe-region hives. No additives.'],
  [2, 'Rwanda Green Tea 250g', 'Food', 'Tea', 5500, 50, '🍵', 'Fresh, smooth green tea leaves from the tea estates of the Western Province.'],
  [2, 'Shea & Avocado Body Butter', 'Beauty', 'Skincare', 9500, 22, '🧴', 'Rich body butter made with shea and cold-pressed avocado oil. Fragrance-free option.'],
];

const printCreds = [];

async function ensureUser({ name, email, phone, role, password, mustChangePassword = false }) {
  const existing = await users.findByEmail(email);
  if (existing) { printCreds.push([role, email, '(already exists - unchanged)']); return existing; }
  const pwd = password || generatePassword();
  const user = await users.createUser({ name, email, phone, password: pwd, role, mustChangePassword });
  printCreds.push([role, email, pwd]);
  return user;
}

async function run() {
  if (process.argv.includes('--reset')) {
    console.log('[seed] --reset: wiping marketplace data...');
    await query('truncate table order_items, payments, orders, products, sellers, seller_applications, categories, users, settings restart identity cascade');
    await query("insert into settings (key) values ('marketplace') on conflict do nothing");
  }

  await ensureUser({ name: 'Marketplace Admin', email: (process.env.SEED_ADMIN_EMAIL || 'admin@madeinrwanda.rw').toLowerCase(), phone: '0780000000', role: 'admin', password: process.env.SEED_ADMIN_PASSWORD });
  await ensureUser({ name: 'Marketplace Manager', email: (process.env.SEED_MANAGER_EMAIL || 'manager@madeinrwanda.rw').toLowerCase(), phone: '0780000001', role: 'manager', password: process.env.SEED_MANAGER_PASSWORD });

  const cats = {};
  for (const [name, icon, description, subcategories] of CATEGORIES) {
    const slug = slugify(name);
    const { rows } = await query(
      `insert into categories (name, slug, icon, description, subcategories) values ($1,$2,$3,$4,$5)
       on conflict (slug) do update set name = excluded.name returning id`,
      [name, slug, icon, description, subcategories]
    );
    cats[name] = rows[0].id;
  }

  const samplePwd = process.env.SEED_SAMPLE_PASSWORD || undefined;
  const sellerDocs = [];
  for (const s of SELLERS) {
    const user = await ensureUser({ name: s.name, email: s.email, phone: s.phone, role: 'seller', password: samplePwd });
    let seller = (await query('select * from sellers where user_id = $1', [user.id])).rows[0];
    if (!seller) {
      const slug = slugify(s.business);
      const logo = makeImage(`${slug}-logo`, s.business.split(' ')[0], '🏺', s.colors, 0);
      const store = makeImage(`${slug}-store`, s.business, '🏪', s.colors, 1);
      const app = (await query(
        `insert into seller_applications (full_name, email, phone, address, district, sector, business_name, business_description, business_category,
           business_location, business_phone, business_email, logo, store_photo, business_images, status, reviewed_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'approved', now()) returning id`,
        [s.name, s.email, s.phone, s.location, s.district, s.sector, s.business, s.about, s.category, s.location, s.phone, s.email, logo, store, [store]]
      )).rows[0];
      seller = (await query(
        `insert into sellers (user_id, application_id, business_name, business_description, business_category, business_location, district, sector,
           business_phone, business_email, logo, store_photo, business_images, status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'approved') returning *`,
        [user.id, app.id, s.business, s.about, s.category, s.location, s.district, s.sector, s.phone, s.email, logo, store, [store]]
      )).rows[0];
      await query('update seller_applications set seller_id = $1 where id = $2', [seller.id, app.id]);
    }
    sellerDocs.push({ seller, colors: s.colors });
  }

  // A pending application so the admin dashboard has something to review
  const pend = await query("select 1 from seller_applications where email = 'pending.applicant@example.rw'");
  if (!pend.rowCount) {
    const colors = ['#20603D', '#00A1DE', '#FAD201'];
    await query(
      `insert into seller_applications (full_name, email, phone, address, district, sector, business_name, business_description, business_category,
         business_location, business_phone, business_email, logo, store_photo, status)
       values ('Ingabire Aline','pending.applicant@example.rw','0781234567','Huye Town','Huye','Ngoma','Butare Pottery Studio',
               'Hand-thrown clay pottery and ceramics from Huye, using local clay and traditional firing methods.','Handmade Crafts','Ngoma, Huye',
               '0781234567','pending.applicant@example.rw',$1,$2,'pending')`,
      [makeImage('butare-logo', 'Butare Pottery', '🏺', colors, 0), makeImage('butare-store', 'Butare Pottery Studio', '🏪', colors, 1)]
    );
  }

  let created = 0;
  for (const [si, name, catName, sub, price, stock, emoji, description] of PRODUCTS) {
    const { seller, colors } = sellerDocs[si];
    if ((await query('select 1 from products where seller_id = $1 and name = $2', [seller.id, name])).rowCount) continue;
    const slug = slugify(name).slice(0, 40);
    await query(
      `insert into products (seller_id, name, description, price, stock, category_id, subcategory, location, status, images)
       values ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9)`,
      [seller.id, name, description, price, stock, cats[catName], sub, seller.business_location,
        [makeImage(slug, name.slice(0, 26), emoji, colors, 0), makeImage(slug, name.slice(0, 26), emoji, colors, 1)]]
    );
    created += 1;
  }

  await ensureUser({ name: 'Demo Buyer', email: 'buyer@example.rw', phone: '0788123456', role: 'buyer', password: samplePwd });

  console.log(`\n[seed] Done. Categories: ${CATEGORIES.length}, sellers: ${SELLERS.length}, products created: ${created}`);
  console.log('\n===== ACCOUNTS (shown once - store them safely) =====');
  printCreds.forEach(([role, email, pwd]) => console.log(`${role.padEnd(8)} ${email.padEnd(34)} ${pwd}`));
  console.log('=====================================================\n');
}

run().catch((err) => { console.error('[seed] failed:', err.message); process.exitCode = 1; }).finally(() => pool.end());
