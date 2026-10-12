const { query } = require('../config/db');
const { PRODUCT_SELECT } = require('../models/mappers');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validators');
const { saveImages, deleteImages } = require('../services/storageService');

async function validateProductBody(b) {
  const errors = {};
  if (!v.isNonEmpty(b.name, 2, 120)) errors.name = 'Product name must be 2-120 characters.';
  if (!v.isNonEmpty(b.description, 10, 4000)) errors.description = 'Description must be at least 10 characters.';
  if (!v.isPositiveInt(b.price, 1, 100000000)) errors.price = 'Enter a price in whole RWF (minimum 1).';
  if (!v.isPositiveInt(b.stock, 0, 1000000)) errors.stock = 'Stock must be a whole number (0 or more).';
  if (!v.isUuid(b.category)) errors.category = 'Select a category.';
  if (b.subcategory && !v.isNonEmpty(b.subcategory, 1, 60)) errors.subcategory = 'Subcategory is too long.';
  if (b.status && !['active', 'inactive'].includes(b.status)) errors.status = 'Status must be active or inactive.';
  let category = null;
  if (!errors.category) {
    category = (await query('select * from categories where id = $1 and is_active = true', [b.category])).rows[0];
    if (!category) errors.category = 'Selected category does not exist.';
  }
  v.throwIfErrors(errors);
  return category;
}

// GET /api/products  (public marketplace search & filters)
exports.list = asyncHandler(async (req, res) => {
  const { q, category, minPrice, maxPrice, seller, inStock, sort } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 12));

  const where = ["p.status = 'active'", "s.status = 'approved'"];
  const params = [];
  const add = (val) => { params.push(val); return `$${params.length}`; };

  if (seller) {
    if (!v.isUuid(seller)) throw new AppError('Invalid identifier supplied.', 400);
    where.push(`p.seller_id = ${add(seller)}`);
  }
  if (v.isString(q) && q.trim()) {
    const like = add(`%${v.escapeLike(q.trim().slice(0, 100))}%`);
    where.push(`(p.name ilike ${like} or p.description ilike ${like} or s.business_name ilike ${like} or c.name ilike ${like})`);
  }
  if (v.isString(category) && category) {
    const c = add(category.toLowerCase());
    where.push(`(c.slug = ${c} or c.id::text = ${c})`);
  }
  if (minPrice !== undefined && minPrice !== '' && Number(minPrice) >= 0) where.push(`p.price >= ${add(Math.floor(Number(minPrice)))}`);
  if (maxPrice !== undefined && maxPrice !== '' && Number(maxPrice) >= 0) where.push(`p.price <= ${add(Math.floor(Number(maxPrice)))}`);
  if (inStock === 'true') where.push('p.stock > 0');

  const orderBy = { price_asc: 'p.price asc, p.created_at desc', price_desc: 'p.price desc, p.created_at desc' }[sort] || 'p.created_at desc';
  const whereSql = where.join(' and ');
  const [list, count] = await Promise.all([
    query(`${PRODUCT_SELECT} where ${whereSql} order by ${orderBy} limit ${limit} offset ${(page - 1) * limit}`, params),
    query(`select count(*)::int as n from products p join sellers s on s.id = p.seller_id join categories c on c.id = p.category_id where ${whereSql}`, params),
  ]);
  const total = count.rows[0].n;
  res.json({ success: true, products: list.rows, total, page, pages: Math.ceil(total / limit) || 1 });
});

// GET /api/products/mine  (approved seller: own products, any status except removed)
exports.mine = asyncHandler(async (req, res) => {
  const where = ['p.seller_id = $1'];
  const params = [req.seller._id];
  if (['active', 'inactive'].includes(req.query.status)) { params.push(req.query.status); where.push(`p.status = $${params.length}`); } else where.push("p.status <> 'removed'");
  if (v.isUuid(req.query.category)) { params.push(req.query.category); where.push(`p.category_id = $${params.length}`); }
  if (v.isString(req.query.q) && req.query.q.trim()) { params.push(`%${v.escapeLike(req.query.q.trim().slice(0, 100))}%`); where.push(`p.name ilike $${params.length}`); }
  if (req.query.stock === 'low') where.push('p.stock <= 5');
  const { rows } = await query(`${PRODUCT_SELECT} where ${where.join(' and ')} order by p.created_at desc`, params);
  res.json({ success: true, products: rows });
});

// GET /api/products/:id  (public for active products; owner/admin can view own/any)
exports.getOne = asyncHandler(async (req, res) => {
  const { rows } = await query(`${PRODUCT_SELECT} where p.id = $1`, [req.params.id]);
  const product = rows[0];
  if (!product) throw new AppError('Product not found', 404);
  const isStaff = req.user && ['admin', 'manager'].includes(req.user.role);
  let isOwner = false;
  if (req.user && req.user.role === 'seller') {
    const s = await query('select id from sellers where user_id = $1', [req.user._id]);
    isOwner = !!s.rows[0] && s.rows[0].id === product.seller._id;
  }
  const publiclyVisible = product.status === 'active' && product.seller.status === 'approved';
  if (!publiclyVisible && !isStaff && !(isOwner && product.status !== 'removed')) throw new AppError('Product not found', 404);
  res.json({ success: true, product });
});

exports.create = asyncHandler(async (req, res) => {
  const category = await validateProductBody(req.body);
  const files = req.files || [];
  if (files.length < 1) throw new AppError('Please upload at least one product image.', 400, { images: 'Upload at least one image.' });
  if (req.body.subcategory && category.subcategories.length && !category.subcategories.includes(req.body.subcategory.trim())) {
    throw new AppError('Please correct the highlighted fields.', 400, { subcategory: 'Choose a subcategory from the list.' });
  }
  const images = await saveImages(files, 'products');
  try {
    const { rows } = await query(
      `insert into products (seller_id, name, description, price, stock, category_id, subcategory, location, status, images)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
      [req.seller._id, req.body.name.trim(), req.body.description.trim(), Number(req.body.price), Number(req.body.stock), category.id,
        req.body.subcategory ? req.body.subcategory.trim() : null,
        String(req.body.location || req.seller.businessLocation || '').trim().slice(0, 120),
        req.body.status === 'inactive' ? 'inactive' : 'active', images]
    );
    const product = (await query(`${PRODUCT_SELECT} where p.id = $1`, [rows[0].id])).rows[0];
    res.status(201).json({ success: true, product });
  } catch (err) {
    await deleteImages(images);
    throw err;
  }
});

exports.update = asyncHandler(async (req, res) => {
  const current = (await query('select * from products where id = $1', [req.params.id])).rows[0];
  if (!current || current.status === 'removed') throw new AppError('Product not found', 404);
  // Ownership: a seller can only edit their OWN products
  if (current.seller_id !== req.seller._id) throw new AppError('Unauthorized access: you can only edit your own products.', 403);

  const category = await validateProductBody(req.body);
  let keep = [];
  try { keep = JSON.parse(req.body.keepImages || '[]'); } catch (e) { throw new AppError('Invalid image list.', 400); }
  keep = (Array.isArray(keep) ? keep : []).filter((u) => current.images.includes(u));
  const files = req.files || [];
  if (keep.length + files.length < 1) throw new AppError('A product needs at least one image.', 400, { images: 'Keep or upload at least one image.' });
  if (keep.length + files.length > 6) throw new AppError('A product can have at most 6 images.', 400, { images: 'Maximum 6 images.' });

  const newUrls = await saveImages(files, 'products');
  const removed = current.images.filter((u) => !keep.includes(u));
  try {
    await query(
      `update products set name=$1, description=$2, price=$3, stock=$4, category_id=$5, subcategory=$6, location=$7, status=$8, images=$9 where id=$10`,
      [req.body.name.trim(), req.body.description.trim(), Number(req.body.price), Number(req.body.stock), category.id,
        req.body.subcategory ? req.body.subcategory.trim() : null,
        req.body.location ? String(req.body.location).trim().slice(0, 120) : current.location,
        ['active', 'inactive'].includes(req.body.status) ? req.body.status : current.status, [...keep, ...newUrls], current.id]
    );
  } catch (err) {
    await deleteImages(newUrls);
    throw err;
  }
  await deleteImages(removed);
  const product = (await query(`${PRODUCT_SELECT} where p.id = $1`, [current.id])).rows[0];
  res.json({ success: true, product });
});

exports.remove = asyncHandler(async (req, res) => {
  const product = (await query('select * from products where id = $1', [req.params.id])).rows[0];
  if (!product) throw new AppError('Product not found', 404);
  if (req.user.role === 'seller') {
    const s = (await query('select id from sellers where user_id = $1', [req.user._id])).rows[0];
    if (!s || product.seller_id !== s.id) throw new AppError('Unauthorized access: you can only delete your own products.', 403);
    await query('delete from products where id = $1', [product.id]);
    await deleteImages(product.images);
    return res.json({ success: true, message: 'Product deleted.' });
  }
  // admin / manager: soft-remove (kept for order history)
  await query("update products set status = 'removed' where id = $1", [product.id]);
  return res.json({ success: true, message: 'Product removed from the marketplace.' });
});
