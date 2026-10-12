const { query } = require('../config/db');
const users = require('../models/users');
const bcrypt = require('bcryptjs');
const { userJson, sellerJson } = require('../models/mappers');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const generatePassword = require('../utils/generatePassword');
const v = require('../utils/validators');

const settingsJson = (s) => ({
  marketplaceName: s.marketplace_name, supportEmail: s.support_email, supportPhone: s.support_phone,
  deliveryFee: s.delivery_fee, freeDeliveryThreshold: s.free_delivery_threshold, currency: s.currency,
});
const getSettings = async () => (await query("select * from settings where key = 'marketplace'")).rows[0];

exports.stats = asyncHandler(async (req, res) => {
  const [counts, sales, byStatus, recent] = await Promise.all([
    query(`select
        (select count(*)::int from users where role = 'buyer') as total_users,
        (select count(*)::int from sellers) as total_sellers,
        (select count(*)::int from seller_applications where status = 'pending') as pending_applications,
        (select count(*)::int from products where status <> 'removed') as total_products,
        (select count(*)::int from orders where status <> 'Pending') as total_orders`),
    query("select coalesce(sum(total_amount), 0)::float8 as total from orders where status in ('Paid','Processing','Shipped','Delivered')"),
    query('select status, count(*)::int as n from orders group by status'),
    query(`select o.id as "_id", o.order_number as "orderNumber", o.status, o.total_amount as "totalAmount", o.created_at as "createdAt",
                  json_build_object('name', u.name) as buyer
           from orders o join users u on u.id = o.buyer_id where o.status <> 'Pending' order by o.created_at desc limit 6`),
  ]);
  const c = counts.rows[0];
  res.json({
    success: true,
    stats: {
      totalUsers: c.total_users, totalSellers: c.total_sellers, pendingApplications: c.pending_applications,
      totalProducts: c.total_products, totalOrders: c.total_orders, totalSales: sales.rows[0].total,
      ordersByStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, r.n])), recentOrders: recent.rows,
    },
  });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const params = [];
  let where = "role = 'buyer'";
  if (v.isString(req.query.q) && req.query.q.trim()) {
    params.push(`%${v.escapeLike(req.query.q.trim().slice(0, 80))}%`);
    where += ' and (name ilike $1 or email ilike $1 or phone ilike $1)';
  }
  const { rows } = await query(`select * from users where ${where} order by created_at desc limit 500`, params);
  res.json({ success: true, users: rows.map(userJson) });
});

exports.setUserStatus = asyncHandler(async (req, res) => {
  const isActive = req.body.isActive === true || req.body.isActive === 'true';
  const { rows } = await query("update users set is_active = $1 where id = $2 and role = 'buyer' returning *", [isActive, req.params.id]);
  if (!rows[0]) throw new AppError('User not found', 404);
  res.json({ success: true, user: userJson(rows[0]) });
});

exports.listSellers = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `select s.*, json_build_object('_id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone,
                                   'isActive', u.is_active, 'lastLoginAt', u.last_login_at) as user_ref,
            (select count(*)::int from products p where p.seller_id = s.id and p.status <> 'removed') as product_count
     from sellers s join users u on u.id = s.user_id order by s.created_at desc`
  );
  res.json({ success: true, sellers: rows.map(({ user_ref: user, ...row }) => ({ ...sellerJson(row), user })) });
});

exports.setSellerStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'suspended'].includes(status)) throw new AppError('Status must be approved or suspended.', 400);
  const { rows } = await query('update sellers set status = $1 where id = $2 returning *', [status, req.params.id]);
  if (!rows[0]) throw new AppError('Seller not found', 404);
  res.json({ success: true, seller: sellerJson(rows[0]) });
});

// Admin issues a fresh one-time password for a seller (e.g. forgotten credentials)
exports.resetSellerCredentials = asyncHandler(async (req, res) => {
  const seller = (await query('select * from sellers where id = $1', [req.params.id])).rows[0];
  if (!seller) throw new AppError('Seller not found', 404);
  const user = await users.findById(seller.user_id);
  if (!user) throw new AppError('Seller account not found', 404);
  const password = generatePassword();
  await query('update users set password_hash = $1, must_change_password = true where id = $2', [await bcrypt.hash(password, 12), user.id]);
  res.json({ success: true, credentials: { email: user.email, password, loginUrl: '/seller/login' }, message: 'New password generated. It is shown only once.' });
});

exports.listProducts = asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  if (['active', 'inactive', 'removed'].includes(req.query.status)) { params.push(req.query.status); where.push(`p.status = $${params.length}`); }
  if (v.isString(req.query.q) && req.query.q.trim()) { params.push(`%${v.escapeLike(req.query.q.trim().slice(0, 100))}%`); where.push(`p.name ilike $${params.length}`); }
  const { PRODUCT_SELECT } = require('../models/mappers');
  const { rows } = await query(`${PRODUCT_SELECT} ${where.length ? `where ${where.join(' and ')}` : ''} order by p.created_at desc limit 500`, params);
  res.json({ success: true, products: rows });
});

exports.setProductStatus = asyncHandler(async (req, res) => {
  if (!['active', 'inactive', 'removed'].includes(req.body.status)) throw new AppError('Invalid product status.', 400);
  const { rows } = await query('update products set status = $1 where id = $2 returning id, status', [req.body.status, req.params.id]);
  if (!rows[0]) throw new AppError('Product not found', 404);
  res.json({ success: true, product: { _id: rows[0].id, status: rows[0].status } });
});

exports.getSettings = asyncHandler(async (req, res) => res.json({ success: true, settings: settingsJson(await getSettings()) }));

exports.updateSettings = asyncHandler(async (req, res) => {
  const b = req.body;
  const errors = {};
  if (!v.isNonEmpty(b.marketplaceName, 2, 80)) errors.marketplaceName = 'Enter the marketplace name.';
  if (!v.isEmail(b.supportEmail)) errors.supportEmail = 'Enter a valid support email.';
  if (!v.normalizePhone(b.supportPhone)) errors.supportPhone = 'Enter a valid Rwanda phone number.';
  if (!v.isPositiveInt(b.deliveryFee, 0, 1000000)) errors.deliveryFee = 'Delivery fee must be 0 or more.';
  if (!v.isPositiveInt(b.freeDeliveryThreshold, 0, 100000000)) errors.freeDeliveryThreshold = 'Threshold must be 0 or more (0 disables free delivery).';
  v.throwIfErrors(errors);
  const { rows } = await query(
    `update settings set marketplace_name=$1, support_email=$2, support_phone=$3, delivery_fee=$4, free_delivery_threshold=$5
     where key = 'marketplace' returning *`,
    [b.marketplaceName.trim(), b.supportEmail.trim().toLowerCase(), v.normalizePhone(b.supportPhone), Number(b.deliveryFee), Number(b.freeDeliveryThreshold)]
  );
  res.json({ success: true, settings: settingsJson(rows[0]) });
});

exports.publicSettings = asyncHandler(async (req, res) => res.json({ success: true, settings: settingsJson(await getSettings()) }));
