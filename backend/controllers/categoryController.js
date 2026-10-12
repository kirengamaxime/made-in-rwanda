const { query } = require('../config/db');
const { categoryJson } = require('../models/mappers');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validators');

const slugify = (s) => s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const parseBody = (b) => {
  const errors = {};
  if (!v.isNonEmpty(b.name, 2, 60)) errors.name = 'Category name must be 2-60 characters.';
  v.throwIfErrors(errors);
  const subs = Array.isArray(b.subcategories) ? b.subcategories : String(b.subcategories || '').split(',');
  return {
    name: b.name.trim(),
    slug: slugify(b.name),
    description: v.isString(b.description) ? b.description.trim().slice(0, 300) : '',
    icon: v.isString(b.icon) && b.icon.trim() ? b.icon.trim().slice(0, 4) : '🛍️',
    subcategories: subs.map((s) => String(s).trim()).filter(Boolean).slice(0, 20),
    isActive: b.isActive !== false && b.isActive !== 'false',
  };
};

// Public: active categories with product counts (admins can pass ?all=true)
exports.list = asyncHandler(async (req, res) => {
  const all = req.query.all === 'true' && req.user && ['admin', 'manager'].includes(req.user.role);
  const { rows } = await query(
    `select c.*, count(p.id)::int as product_count
     from categories c left join products p on p.category_id = c.id and p.status = 'active'
     ${all ? '' : 'where c.is_active = true'}
     group by c.id order by c.name`
  );
  res.json({ success: true, categories: rows.map(categoryJson) });
});

exports.create = asyncHandler(async (req, res) => {
  const d = parseBody(req.body);
  if ((await query('select 1 from categories where name = $1 or slug = $2', [d.name, d.slug])).rowCount) throw new AppError('Category already exists', 409);
  const { rows } = await query(
    'insert into categories (name, slug, description, icon, subcategories, is_active) values ($1,$2,$3,$4,$5,$6) returning *',
    [d.name, d.slug, d.description, d.icon, d.subcategories, d.isActive]
  );
  res.status(201).json({ success: true, category: categoryJson(rows[0]) });
});

exports.update = asyncHandler(async (req, res) => {
  const d = parseBody(req.body);
  if (!(await query('select 1 from categories where id = $1', [req.params.id])).rowCount) throw new AppError('Category not found', 404);
  if ((await query('select 1 from categories where id <> $1 and (name = $2 or slug = $3)', [req.params.id, d.name, d.slug])).rowCount) throw new AppError('Category already exists', 409);
  const { rows } = await query(
    'update categories set name=$1, slug=$2, description=$3, icon=$4, subcategories=$5, is_active=$6 where id=$7 returning *',
    [d.name, d.slug, d.description, d.icon, d.subcategories, d.isActive, req.params.id]
  );
  res.json({ success: true, category: categoryJson(rows[0]) });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!(await query('select 1 from categories where id = $1', [req.params.id])).rowCount) throw new AppError('Category not found', 404);
  if ((await query('select 1 from products where category_id = $1 limit 1', [req.params.id])).rowCount) throw new AppError('This category still has products. Deactivate it instead of deleting.', 400);
  await query('delete from categories where id = $1', [req.params.id]);
  res.json({ success: true, message: 'Category deleted.' });
});
