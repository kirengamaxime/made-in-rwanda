-- Made in Rwanda marketplace - PostgreSQL / Supabase schema (idempotent: safe to run more than once)

create extension if not exists pgcrypto;

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- USERS --------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null unique,
  phone text,
  password_hash text not null,
  role text not null default 'buyer' check (role in ('buyer','seller','admin','manager')),
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists users_role_idx on users (role);

-- CATEGORIES ---------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text not null default '🛍️',
  subcategories text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SELLER APPLICATIONS (seller_id FK is added after sellers exists) -----------
create table if not exists seller_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  national_id text,
  address text not null,
  district text not null,
  sector text not null,
  business_name text not null,
  business_description text not null,
  business_category text not null,
  business_location text not null,
  business_phone text not null,
  business_email text not null,
  registration_number text,
  logo text not null,
  store_photo text not null,
  business_images text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  seller_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists seller_applications_status_idx on seller_applications (status);
create index if not exists seller_applications_email_idx on seller_applications (email);
-- one open (pending/approved) application per email, even under concurrent submits
create unique index if not exists seller_applications_active_email_key on seller_applications (email) where status in ('pending','approved');

-- SELLERS ------------------------------------------------------------------
create table if not exists sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  application_id uuid references seller_applications(id) on delete set null,
  business_name text not null,
  business_description text,
  business_category text,
  business_location text,
  district text,
  sector text,
  business_phone text,
  business_email text,
  registration_number text,
  logo text,
  store_photo text,
  business_images text[] not null default '{}',
  status text not null default 'approved' check (status in ('approved','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'seller_applications_seller_fk') then
    alter table seller_applications add constraint seller_applications_seller_fk foreign key (seller_id) references sellers(id) on delete set null;
  end if;
end $$;

-- PRODUCTS -----------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id) on delete cascade,
  name text not null,
  description text not null,
  price integer not null check (price >= 1),
  category_id uuid not null references categories(id),
  subcategory text,
  images text[] not null check (cardinality(images) between 1 and 6),
  stock integer not null default 0 check (stock >= 0),
  location text,
  status text not null default 'active' check (status in ('active','inactive','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_seller_idx on products (seller_id);
create index if not exists products_category_idx on products (category_id);
create index if not exists products_status_idx on products (status);
create index if not exists products_created_idx on products (created_at desc);
create index if not exists products_price_idx on products (price);

-- ORDERS / ITEMS / PAYMENTS (orders.payment_id FK added after payments) ---------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  buyer_id uuid not null references users(id),
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total_amount integer not null check (total_amount >= 0),
  currency text not null default 'RWF',
  delivery_full_name text not null,
  delivery_phone text not null,
  delivery_address text not null,
  delivery_district text not null,
  delivery_sector text not null,
  delivery_instructions text,
  payment_id uuid,
  status text not null default 'Pending' check (status in ('Pending','Paid','Processing','Shipped','Delivered','Cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_buyer_idx on orders (buyer_id);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_idx on orders (created_at desc);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  line_no integer not null default 0,
  product_id uuid references products(id) on delete set null,
  seller_id uuid not null references sellers(id),
  name text not null,
  image text,
  quantity integer not null check (quantity >= 1),
  unit_price integer not null check (unit_price >= 0),
  fulfillment_status text not null default 'Pending' check (fulfillment_status in ('Pending','Processing','Shipped','Delivered','Cancelled'))
);
create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists order_items_seller_idx on order_items (seller_id);

-- SAFE payment data only: raw card numbers / CVV are never stored.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  buyer_id uuid not null references users(id),
  method text not null check (method in ('mtn_momo','airtel_money','card')),
  amount integer not null check (amount >= 0),
  currency text not null default 'RWF',
  transaction_reference text not null unique,
  provider_reference text,
  provider text not null default 'simulated',
  status text not null default 'pending' check (status in ('pending','processing','successful','failed','cancelled')),
  phone text,
  card_brand text,
  card_last4 text,
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order_idx on payments (order_id);
create index if not exists payments_status_idx on payments (status);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_fk') then
    alter table orders add constraint orders_payment_fk foreign key (payment_id) references payments(id) on delete set null;
  end if;
end $$;

-- SETTINGS (single row) ----------------------------------------------------
create table if not exists settings (
  key text primary key default 'marketplace',
  marketplace_name text not null default 'Made in Rwanda',
  support_email text not null default 'support@madeinrwanda.rw',
  support_phone text not null default '0780000000',
  delivery_fee integer not null default 2000 check (delivery_fee >= 0),
  free_delivery_threshold integer not null default 100000 check (free_delivery_threshold >= 0),
  currency text not null default 'RWF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into settings (key) values ('marketplace') on conflict do nothing;

-- updated_at triggers --------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['users','categories','seller_applications','sellers','products','orders','payments','settings'] loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- SECURITY: Supabase exposes every table in "public" through its auto-generated REST API using the
-- public anon key. Row Level Security with NO policies blocks all of that access. This app's Express
-- server connects with the database owner role (which bypasses RLS), so it keeps working while
-- password hashes and orders stay unreachable from the browser.
do $$
declare t text;
begin
  foreach t in array array['users','categories','seller_applications','sellers','products','orders','order_items','payments','settings'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
