const { query } = require('../config/db');
const { sellerJson } = require('../models/mappers');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validators');

exports.listPublic = asyncHandler(async (req, res) => {
  const { rows } = await query("select id as \"_id\", business_name as \"businessName\", logo, business_location as \"businessLocation\" from sellers where status = 'approved' order by business_name");
  res.json({ success: true, sellers: rows });
});

exports.myProfile = asyncHandler(async (req, res) => res.json({ success: true, seller: req.seller }));

exports.updateProfile = asyncHandler(async (req, res) => {
  const b = req.body;
  const errors = {};
  if (!v.isNonEmpty(b.businessDescription, 20, 2000)) errors.businessDescription = 'Describe your business in at least 20 characters.';
  if (!v.isNonEmpty(b.businessLocation, 3, 250)) errors.businessLocation = 'Enter your business location.';
  const phone = v.normalizePhone(b.businessPhone);
  if (!phone) errors.businessPhone = 'Invalid business phone number.';
  if (!v.isEmail(b.businessEmail)) errors.businessEmail = 'Enter a valid business email.';
  v.throwIfErrors(errors);
  const { rows } = await query(
    'update sellers set business_description=$1, business_location=$2, business_phone=$3, business_email=$4 where id=$5 returning *',
    [b.businessDescription.trim(), b.businessLocation.trim(), phone, b.businessEmail.trim().toLowerCase(), req.seller._id]
  );
  res.json({ success: true, seller: sellerJson(rows[0]) });
});

exports.stats = asyncHandler(async (req, res) => {
  const sid = req.seller._id;
  const [prod, ord, top] = await Promise.all([
    query("select count(*)::int as total, count(*) filter (where stock <= 5)::int as low from products where seller_id = $1 and status <> 'removed'", [sid]),
    query(
      `select count(distinct o.id)::int as total_orders,
              coalesce(sum(i.unit_price * i.quantity) filter (where o.status <> 'Cancelled' and i.fulfillment_status <> 'Cancelled'), 0)::float8 as total_sales,
              count(distinct o.id) filter (where o.status <> 'Cancelled' and i.fulfillment_status in ('Pending','Processing'))::int as pending_orders
       from order_items i join orders o on o.id = i.order_id
       where i.seller_id = $1 and o.status <> 'Pending'`, [sid]
    ),
    query(
      `select i.name, sum(i.quantity)::int as units from order_items i join orders o on o.id = i.order_id
       where i.seller_id = $1 and o.status not in ('Pending','Cancelled') and i.fulfillment_status <> 'Cancelled'
       group by i.name order by units desc limit 5`, [sid]
    ),
  ]);
  res.json({
    success: true,
    stats: {
      totalProducts: prod.rows[0].total, lowStock: prod.rows[0].low, totalOrders: ord.rows[0].total_orders,
      totalSales: ord.rows[0].total_sales, pendingOrders: ord.rows[0].pending_orders, topProducts: top.rows,
    },
  });
});
