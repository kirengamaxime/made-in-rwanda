# Made in Rwanda Marketplace

Full-stack marketplace: **React + Vite + Tailwind** (frontend) · **Node + Express** (API) · **Supabase** (PostgreSQL database + Storage for images).

```
made-in-rwanda/
├── backend/    Express API  (controllers, models, routes, middleware, services, utils, database/schema.sql)
└── frontend/   React app    (pages, components, context, services)
```

The API does its own authentication (JWT + bcrypt + roles `buyer | seller | admin | manager`) and talks to Supabase's Postgres directly with SQL. Supabase Auth is intentionally not used, because sellers must be created by an admin and never self-register.

## 1. Create the Supabase project (5 minutes)
1. Sign up at https://supabase.com and click **New project**. Pick a region near Rwanda (e.g. *eu-central* or *eu-west*) and set a **database password**. Save it.
2. **Database URL:** open your project → click **Connect** (top bar) → **Connection string** → choose **Session pooler**. Copy the URI. It looks like  
   `postgresql://postgres.abcdefghij:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`  
   Replace `[YOUR-PASSWORD]` with your password (remove the brackets). If the password contains `@ : / # ?` URL-encode them (`@` → `%40`).  
   *Use the Session pooler, not "Direct connection": the direct host is IPv6-only and fails on most home/office networks.*
3. **Storage keys:** **Project Settings → API**. Copy the **Project URL** and the **`service_role` secret key**. The service key is server-side only: never put it in the frontend or commit it.

## 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```
Edit `backend/.env`:
```
PORT=5000
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres.xxxx:YOURPASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_BUCKET=made-in-rwanda
PAYMENT_PROVIDER=simulated
SEED_ADMIN_EMAIL=admin@madeinrwanda.rw
SEED_ADMIN_PASSWORD=            # blank = random, printed once by the seed script
```
Create the tables, add sample data and start the API:
```bash
npm run db:init       # creates all tables from database/schema.sql (safe to re-run)
npm run seed          # admin, manager, categories, 3 sellers, 12 products, 1 pending application, 1 demo buyer
npm run dev           # http://localhost:5000
```
*(Alternative to `db:init`: paste `backend/database/schema.sql` into Supabase → **SQL Editor** → Run.)*

You should see `[db] Connected to Postgres` and, if Storage keys are set, `[storage] Supabase bucket "made-in-rwanda" ready`. The public image bucket is created automatically on first start.

## 3. Frontend setup
```bash
cd frontend
npm install
npm run dev           # http://localhost:5173 (proxies /api and /uploads to :5000)
```

## 4. Database design
| Table | Purpose / key relations |
|---|---|
| `users` | all accounts; `role` = buyer/seller/admin/manager; password stored as bcrypt hash |
| `seller_applications` | `applicant_id → users` (optional), `reviewed_by → users`, `seller_id → sellers`; status pending/approved/rejected; one open application per email |
| `sellers` | `user_id → users` (unique), `application_id → seller_applications`; status approved/suspended |
| `categories` | name, slug, subcategories |
| `products` | `seller_id → sellers`, `category_id → categories`, images (URLs), stock, status |
| `orders` | `buyer_id → users`, delivery info, totals, `payment_id → payments`, status |
| `order_items` | `order_id → orders`, `product_id → products`, `seller_id → sellers`; price/name snapshot + per-item fulfillment status |
| `payments` | `order_id → orders`, `buyer_id → users`; method, amount, reference, status, **only** card brand + last4 |
| `settings` | single row: delivery fee, free-delivery threshold, support contacts |

**Row Level Security** is enabled on every table with no policies. Supabase otherwise exposes tables through a public REST API using the anon key; RLS blocks that completely, so password hashes and orders are unreachable from a browser. The Express server connects with the database owner role (bypasses RLS), so the app works normally.

Stock updates and seller approval run in **database transactions** (row locks), so two buyers can't both buy the last unit and an approval can't leave half-created accounts.

## 5. Creating the admin account
`npm run seed` creates the **admin** and **manager** from `SEED_ADMIN_*` / `SEED_MANAGER_*`. Blank passwords are generated randomly and printed **once**: copy them. Existing accounts are never overwritten (`npm run seed:reset` wipes all marketplace data first). Sign in at **/admin/login**. No password exists in frontend code.

## 6. How seller approval works
1. Visitor clicks **Become a Seller** and submits the application (personal info, business info, logo, store photo, extra photos). National ID is optional.
2. It is saved as `pending`. **No user or seller account exists yet**, so there is nothing to sign in to.
3. Admin/Manager opens **Seller applications**, reviews details and photos, then **Approve** or **Reject** (reason required).
4. **Approve** (one transaction) creates a `users` row (role seller) and a `sellers` row and shows a login email + one-time password once. The password is stored hashed only. The admin shares it with the seller, who must change it after signing in.
5. The seller signs in at **/seller/login**. The API checks role = seller **and** seller status = approved. Suspended sellers are locked out immediately, even with an old token, and their products disappear from the marketplace.
6. Rejected applicants see the reason with the status checker on the Become a Seller page and may re-apply.

There is no public seller sign-up anywhere; `POST /api/auth/register` always creates buyers.

## 7. How image uploads work
- Multer buffers files in memory. Limits: JPG/JPEG/PNG/WEBP only, 5 MB each, max 6 per product. Checked by extension, MIME type **and file signature**; SVG is rejected.
- `services/storageService.js` uploads to a **public Supabase Storage bucket** and the database stores only the URL. If `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are blank it falls back to local disk (`backend/uploads`, development only, since most hosts have ephemeral disks).
- Seed images are small SVGs generated into `uploads/seed` and served by the API.
- The seller form previews images and lets you add, remove and replace; the first image is the main photo. Removed images are deleted from storage.

## 8. Payments: demo now, real provider later
**Nothing here processes real money.** `PAYMENT_PROVIDER=simulated` is the only implemented provider and the UI says so.

Simulated behaviour: MTN (078/079) and Airtel (072/073) numbers are validated by prefix; the request goes to `processing` and is "approved" after ~3 s (numbers ending in `00` are declined). Cards need a valid Luhn number, MM/YY expiry and 3-digit CVV; `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined.

Safety rules in code: card number and CVV exist only in memory during the request and are never logged or saved (the `payments` table has only `card_brand` and `card_last4`); an order becomes `Paid` and stock drops **only** when a payment turns `successful` (idempotent, transactional); prices are recomputed on the server.

**Going live:**
1. Choose a Rwanda-capable provider (e.g. Flutterwave, Pesapal, DPO Pay, Paypack, IremboPay) and open a merchant account.
2. Add a provider object in `backend/services/paymentService.js` implementing `initiate`, `checkStatus`, `cancel` (see the comment at the top) and register it in `providers`; set `PAYMENT_PROVIDER`.
3. For cards use the provider's hosted checkout or tokenizing fields so card data never touches your server, and remove the card inputs from `Checkout.jsx`.
4. Add a webhook route (`POST /api/payments/webhook`) that verifies the provider's signature and calls the existing `settleSuccess` / `settleFailure` functions in `paymentController.js`. Keep polling as a fallback.
5. Implement refunds through the provider API when cancelling paid orders (marked in the code).
6. Keep secrets in environment variables and serve everything over HTTPS.

## 9. Security summary
bcrypt (cost 12) · JWT re-validated against the database on every request · role middleware on every protected route · ownership checks on product edit/delete and order access · parameterized SQL everywhere (no string-built values) · UUID validation · LIKE-wildcard escaping · helmet · CORS allow-list · rate limits (login, applications, global) · upload validation (type, size, count, magic bytes) · RLS on all tables · secrets only in `.env`. Frontend route guards are UX only; the API enforces every rule.

## 10. API overview
`/api/auth` · `/api/seller-applications` · `/api/products` · `/api/categories` · `/api/sellers` · `/api/orders` · `/api/payments` · `/api/settings/public` · `/api/admin/*`

## 11. Deployment
**Database/Storage:** already on Supabase. For production consider a paid plan (free projects pause after a week of inactivity).

**Backend (Render / Railway / Fly.io / VPS):** root `backend`, build `npm install`, start `npm start`. Env vars: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL=https://your-frontend-domain`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`. Run `npm run db:init` and `npm run seed` once (or create the admin from your machine using the same `DATABASE_URL`).

**Frontend (Vercel / Netlify / Cloudflare Pages):** root `frontend`, build `npm run build`, output `dist`. Env: `VITE_API_URL=https://api.yourdomain.com/api` (and `VITE_ASSET_BASE=https://api.yourdomain.com` only if you serve seed/local images). SPA fallbacks are included (`public/_redirects` for Netlify, `vercel.json` for Vercel).

## 12. Five-minute test flow
1. `npm run db:init && npm run seed`, start backend and frontend.
2. Browse, sign up as a buyer, add to cart, check out with MTN `0781234567`: the order becomes *Paid* and stock drops.
3. Click **Become a Seller**, submit an application with images.
4. `/admin/login` → **Seller applications** → Approve → copy the credentials.
5. `/seller/login` → add a product with images → see it on the marketplace.
6. As the seller open **Orders** and mark the order *Shipped*; the buyer sees the update.
