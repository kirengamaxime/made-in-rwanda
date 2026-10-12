/**
 * Row -> JSON mappers. The API keeps a stable JSON shape (camelCase keys and `_id`),
 * so the React frontend does not care that the database is Postgres.
 */
const toCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

function shape(row, drop = []) {
  if (!row) return null;
  const out = {};
  Object.keys(row).forEach((k) => {
    if (drop.includes(k)) return;
    out[k === 'id' ? '_id' : toCamel(k)] = row[k];
  });
  return out;
}

const userJson = (row) => shape(row, ['password_hash']);
const sellerJson = (row) => shape(row);
const categoryJson = (row) => shape(row);
const applicationJson = (row, { withNationalId = false } = {}) => shape(row, withNationalId ? [] : ['national_id']);

const paymentJson = (row) => {
  if (!row) return null;
  const out = shape(row, ['card_brand', 'card_last4']);
  out.card = { brand: row.card_brand || undefined, last4: row.card_last4 || undefined };
  return out;
};

// SQL fragment: product with its seller and category embedded (like a populated document)
const PRODUCT_SELECT = `
  select p.id as "_id", p.name, p.description, p.price, p.subcategory, p.images, p.stock, p.location, p.status,
         p.created_at as "createdAt", p.updated_at as "updatedAt",
         json_build_object('_id', s.id, 'businessName', s.business_name, 'logo', s.logo,
                           'businessLocation', s.business_location, 'status', s.status) as seller,
         json_build_object('_id', c.id, 'name', c.name, 'slug', c.slug, 'icon', c.icon,
                           'subcategories', c.subcategories) as category
  from products p
  join sellers s on s.id = p.seller_id
  join categories c on c.id = p.category_id`;

module.exports = { shape, userJson, sellerJson, categoryJson, applicationJson, paymentJson, PRODUCT_SELECT };
