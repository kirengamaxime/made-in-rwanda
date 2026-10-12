const { query, tx } = require('../config/db');
const { loadOrders, loadOrder } = require('../models/orders');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validators');

const RANK = { Pending: 1, Processing: 2, Shipped: 3, Delivered: 4 };
const STATUS_FROM_RANK = { 1: 'Paid', 2: 'Processing', 3: 'Shipped', 4: 'Delivered' };
const ORDER_STATUSES = ['Pending', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

// Overall order status is derived from the least-advanced non-cancelled item.
function deriveStatus(items) {
  const active = items.filter((i) => i.fulfillment_status !== 'Cancelled');
  if (!active.length) return 'Cancelled';
  return STATUS_FROM_RANK[Math.min(...active.map((i) => RANK[i.fulfillment_status]))];
}

async function getApprovedSeller(user) {
  const s = (await query('select * from sellers where user_id = $1', [user._id])).rows[0];
  if (!s) throw new AppError('No seller profile found for this account.', 403);
  if (s.status !== 'approved') throw new AppError('Your seller account is suspended.', 403);
  return s;
}

// A seller only ever sees their own line items.
function forSeller(order, sellerId) {
  const items = order.items.filter((i) => i.seller === sellerId);
  const sellerTotal = items.filter((i) => i.fulfillmentStatus !== 'Cancelled').reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  return { ...order, items, sellerTotal };
}

exports.create = asyncHandler(async (req, res) => {
  const { items, delivery } = req.body;
  const errors = {};
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) throw new AppError('Your cart is empty.', 400);
  const d = delivery || {};
  if (!v.isNonEmpty(d.fullName, 2, 100)) errors.fullName = 'Enter the customer name.';
  const phone = v.normalizePhone(d.phone);
  if (!phone) errors.phone = 'Invalid phone number. Use a Rwanda number such as 0781234567.';
  if (!v.isNonEmpty(d.address, 3, 250)) errors.address = 'Enter the delivery address.';
  if (!v.isNonEmpty(d.district, 2, 60)) errors.district = 'Select a district.';
  if (!v.isNonEmpty(d.sector, 2, 60)) errors.sector = 'Enter the sector.';
  if (d.instructions && !v.isNonEmpty(d.instructions, 1, 500)) errors.instructions = 'Instructions are too long (max 500).';
  v.throwIfErrors(errors);

  const wanted = new Map();
  for (const it of items) {
    if (!v.isUuid(it.productId) || !v.isPositiveInt(it.quantity, 1, 99)) throw new AppError('Invalid cart item.', 400);
    wanted.set(it.productId, (wanted.get(it.productId) || 0) + Number(it.quantity));
  }
  const { rows: products } = await query(
    `select p.id, p.name, p.price, p.stock, p.images, p.seller_id
     from products p join sellers s on s.id = p.seller_id
     where p.id = any($1::uuid[]) and p.status = 'active' and s.status = 'approved'`,
    [[...wanted.keys()]]
  );
  const lines = [];
  for (const [id, qty] of wanted) {
    const p = products.find((x) => x.id === id);
    if (!p) throw new AppError('Product not found', 404);
    if (p.stock < qty) throw new AppError(`Insufficient stock for "${p.name}". Only ${p.stock} available.`, 400);
    lines.push({ product_id: p.id, seller_id: p.seller_id, name: p.name, image: p.images[0], quantity: qty, unit_price: p.price });
  }
  const settings = (await query("select * from settings where key = 'marketplace'")).rows[0];
  const subtotal = lines.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const free = settings.free_delivery_threshold > 0 && subtotal >= settings.free_delivery_threshold;
  const deliveryFee = free ? 0 : settings.delivery_fee;
  const orderNumber = `MR-${Date.now().toString(36).toUpperCase()}-${require('crypto').randomBytes(2).toString('hex').toUpperCase()}`;

  const orderId = await tx(async (c) => {
    const { rows } = await c.query(
      `insert into orders (order_number, buyer_id, subtotal, delivery_fee, total_amount, delivery_full_name, delivery_phone,
                           delivery_address, delivery_district, delivery_sector, delivery_instructions, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Pending') returning id`,
      [orderNumber, req.user._id, subtotal, deliveryFee, subtotal + deliveryFee, d.fullName.trim(), phone, d.address.trim(),
        d.district.trim(), d.sector.trim(), d.instructions ? d.instructions.trim() : null]
    );
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i];
      await c.query(
        'insert into order_items (order_id, line_no, product_id, seller_id, name, image, quantity, unit_price) values ($1,$2,$3,$4,$5,$6,$7,$8)',
        [rows[0].id, i, l.product_id, l.seller_id, l.name, l.image, l.quantity, l.unit_price]
      );
    }
    return rows[0].id;
  });
  res.status(201).json({ success: true, order: await loadOrder(orderId) });
});

exports.myOrders = asyncHandler(async (req, res) => {
  res.json({ success: true, orders: await loadOrders('o.buyer_id = $1', [req.user._id]) });
});

exports.list = asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  if (ORDER_STATUSES.includes(req.query.status)) { params.push(req.query.status); where.push(`o.status = $${params.length}`); }
  if (req.user.role === 'seller') {
    const seller = await getApprovedSeller(req.user);
    params.push(seller.id);
    where.push(`exists (select 1 from order_items i where i.order_id = o.id and i.seller_id = $${params.length})`);
    if (!req.query.status) where.push("o.status <> 'Pending'"); // sellers only see orders that were paid
    const orders = await loadOrders(where.join(' and '), params);
    return res.json({ success: true, orders: orders.map((o) => forSeller(o, seller.id)) });
  }
  if (v.isString(req.query.q) && req.query.q.trim()) { params.push(`%${v.escapeLike(req.query.q.trim().slice(0, 40))}%`); where.push(`o.order_number ilike $${params.length}`); }
  return res.json({ success: true, orders: await loadOrders(where.length ? where.join(' and ') : 'true', params, { limit: 500 }) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  const role = req.user.role;
  if (role === 'buyer') {
    if (order.buyer._id !== req.user._id) throw new AppError('Order not found', 404);
    return res.json({ success: true, order });
  }
  if (role === 'seller') {
    const seller = await getApprovedSeller(req.user);
    if (!order.items.some((i) => i.seller === seller.id) || order.status === 'Pending') throw new AppError('Order not found', 404);
    return res.json({ success: true, order: forSeller(order, seller.id) });
  }
  return res.json({ success: true, order });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) throw new AppError('Invalid order status.', 400);
  const role = req.user.role;
  const seller = role === 'seller' ? await getApprovedSeller(req.user) : null;

  await tx(async (c) => {
    const order = (await c.query('select * from orders where id = $1 for update', [req.params.id])).rows[0];
    if (!order) throw new AppError('Order not found', 404);
    const items = (await c.query('select * from order_items where order_id = $1', [order.id])).rows;

    const cancelAll = async (restoreStock) => {
      if (restoreStock) {
        for (const i of items.filter((x) => x.fulfillment_status !== 'Cancelled' && x.product_id)) {
          await c.query('update products set stock = stock + $1 where id = $2', [i.quantity, i.product_id]);
        }
      }
      await c.query("update payments set status = 'cancelled' where order_id = $1 and status in ('pending','processing')", [order.id]);
      await c.query("update order_items set fulfillment_status = 'Cancelled' where order_id = $1", [order.id]);
      await c.query("update orders set status = 'Cancelled' where id = $1", [order.id]);
    };

    if (role === 'buyer') {
      if (order.buyer_id !== req.user._id) throw new AppError('Order not found', 404);
      if (status !== 'Cancelled' || order.status !== 'Pending') throw new AppError('You can only cancel an order that has not been paid yet.', 400);
      await cancelAll(false);
    } else if (role === 'seller') {
      if (!['Processing', 'Shipped', 'Delivered'].includes(status)) throw new AppError('Sellers can set Processing, Shipped or Delivered.', 400);
      const mine = items.filter((i) => i.seller_id === seller.id && i.fulfillment_status !== 'Cancelled');
      if (!mine.length) throw new AppError('Order not found', 404);
      if (order.status === 'Pending' || order.status === 'Cancelled') throw new AppError('This order is not paid, so it cannot be fulfilled.', 400);
      if (mine.some((i) => RANK[status] < RANK[i.fulfillment_status])) throw new AppError('An order cannot move backwards in status.', 400);
      await c.query("update order_items set fulfillment_status = $1 where order_id = $2 and seller_id = $3 and fulfillment_status <> 'Cancelled'", [status, order.id, seller.id]);
      const fresh = (await c.query('select fulfillment_status from order_items where order_id = $1', [order.id])).rows;
      await c.query('update orders set status = $1 where id = $2', [deriveStatus(fresh), order.id]);
    } else {
      // admin / manager
      if (['Pending', 'Paid'].includes(status)) throw new AppError('Orders become Paid only through a successful payment.', 400);
      if (order.status === 'Pending' && status !== 'Cancelled') throw new AppError('This order has not been paid yet.', 400);
      if (order.status === 'Cancelled') throw new AppError('This order is already cancelled.', 400);
      if (status === 'Cancelled') await cancelAll(order.status !== 'Pending'); // refunds are handled via the payment provider
      else {
        await c.query("update order_items set fulfillment_status = $1 where order_id = $2 and fulfillment_status <> 'Cancelled'", [status, order.id]);
        await c.query('update orders set status = $1 where id = $2', [status, order.id]);
      }
    }
  });

  const order = await loadOrder(req.params.id);
  res.json({ success: true, order: seller ? forSeller(order, seller.id) : order });
});
