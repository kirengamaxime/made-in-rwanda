const { query, tx } = require('../config/db');
const { paymentJson } = require('../models/mappers');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validators');
const { provider, validatePaymentInput, newReference } = require('../services/paymentService');

const present = (row) => ({ ...paymentJson(row), simulated: !!provider.simulated });

class StockError extends Error {}

/**
 * Marks a payment successful and confirms the order, in ONE database transaction:
 *  - only the first caller can move a payment out of pending/processing (idempotent)
 *  - stock is decremented atomically; if any item is short the whole transaction rolls back
 */
async function settleSuccess(paymentId) {
  try {
    await tx(async (c) => {
      const claimed = (await c.query(
        "update payments set status = 'successful', paid_at = now() where id = $1 and status in ('pending','processing') returning *", [paymentId]
      )).rows[0];
      if (!claimed) return; // already settled by another request
      const order = (await c.query('select * from orders where id = $1 for update', [claimed.order_id])).rows[0];
      if (!order || order.status !== 'Pending') throw new StockError('This order can no longer be paid.');
      const items = (await c.query('select * from order_items where order_id = $1', [order.id])).rows;
      for (const it of items) {
        const r = await c.query("update products set stock = stock - $1 where id = $2 and stock >= $1 and status = 'active'", [it.quantity, it.product_id]);
        if (r.rowCount !== 1) throw new StockError(`Insufficient stock for "${it.name}". You have not been charged.`);
      }
      await c.query("update orders set status = 'Paid', payment_id = $1, paid_at = $2 where id = $3", [claimed.id, claimed.paid_at, order.id]);
    });
  } catch (err) {
    if (!(err instanceof StockError)) throw err;
    // PRODUCTION: if real money was captured by the provider, trigger a refund here.
    await settleFailure(paymentId, err.message);
  }
  return (await query('select * from payments where id = $1', [paymentId])).rows[0];
}

async function settleFailure(paymentId, reason) {
  await query("update payments set status = 'failed', failure_reason = $2 where id = $1 and status in ('pending','processing')", [paymentId, reason || 'Payment failed.']);
  return (await query('select * from payments where id = $1', [paymentId])).rows[0];
}

exports.create = asyncHandler(async (req, res) => {
  const { orderId, method } = req.body;
  if (!v.isUuid(orderId)) throw new AppError('Invalid identifier supplied.', 400);
  const order = (await query('select * from orders where id = $1 and buyer_id = $2', [orderId, req.user._id])).rows[0];
  if (!order) throw new AppError('Order not found', 404);
  if (order.status !== 'Pending') throw new AppError('This order has already been paid or cancelled.', 400);

  const { safe, transient } = validatePaymentInput(method, req.body);

  // Handle stale / in-flight payments
  const inflight = (await query("select * from payments where order_id = $1 and status in ('pending','processing') order by created_at desc limit 1", [order.id])).rows[0];
  if (inflight) {
    if (Date.now() - new Date(inflight.created_at).getTime() < 120000) throw new AppError('A payment for this order is already in progress.', 409);
    await query("update payments set status = 'cancelled' where id = $1", [inflight.id]);
  }
  // Early stock check (the authoritative check happens atomically when the payment settles)
  const stock = await query(
    `select i.name, i.quantity, p.stock, p.status from order_items i left join products p on p.id = i.product_id where i.order_id = $1`, [order.id]
  );
  for (const it of stock.rows) {
    if (it.stock === null || it.status !== 'active' || it.stock < it.quantity) throw new AppError(`Insufficient stock for "${it.name}".`, 400);
  }

  let payment = (await query(
    `insert into payments (order_id, buyer_id, method, amount, currency, transaction_reference, provider, status, phone, card_brand, card_last4)
     values ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10) returning *`,
    [order.id, req.user._id, method, order.total_amount, order.currency, newReference(), provider.name,
      safe.phone || null, safe.card?.brand || null, safe.card?.last4 || null]
  )).rows[0];

  try {
    const result = await provider.initiate({ payment: paymentJson(payment), method, input: { ...transient } });
    await query('update payments set provider_reference = $1 where id = $2', [result.providerReference, payment.id]);
    if (result.status === 'successful') payment = await settleSuccess(payment.id);
    else if (result.status === 'failed') payment = await settleFailure(payment.id, result.failureReason);
    else payment = (await query("update payments set status = 'processing' where id = $1 returning *", [payment.id])).rows[0];
  } catch (err) {
    console.error('[payments] provider error:', err.message);
    payment = await settleFailure(payment.id, 'Payment provider error. Please try again.');
  }
  const fresh = (await query('select id as "_id", status, order_number as "orderNumber" from orders where id = $1', [order.id])).rows[0];
  res.status(payment.status === 'failed' ? 402 : 201).json({
    success: payment.status !== 'failed',
    message: payment.status === 'failed' ? `Payment failed: ${payment.failure_reason}` : undefined,
    payment: present(payment), order: fresh,
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  let payment = (await query('select * from payments where id = $1', [req.params.id])).rows[0];
  if (!payment) throw new AppError('Payment not found', 404);
  const staff = ['admin', 'manager'].includes(req.user.role);
  if (!staff && payment.buyer_id !== req.user._id) throw new AppError('Payment not found', 404);

  if (payment.status === 'processing') {
    const r = await provider.checkStatus(paymentJson(payment));
    if (r.status === 'successful') payment = await settleSuccess(payment.id);
    else if (r.status === 'failed') payment = await settleFailure(payment.id, r.failureReason);
  }
  const order = (await query('select id as "_id", status, order_number as "orderNumber" from orders where id = $1', [payment.order_id])).rows[0];
  res.json({ success: true, payment: present(payment), order });
});

exports.cancel = asyncHandler(async (req, res) => {
  const payment = (await query('select * from payments where id = $1 and buyer_id = $2', [req.params.id, req.user._id])).rows[0];
  if (!payment) throw new AppError('Payment not found', 404);
  if (!['pending', 'processing'].includes(payment.status)) throw new AppError('This payment can no longer be cancelled.', 400);
  await provider.cancel(paymentJson(payment));
  await query("update payments set status = 'cancelled' where id = $1 and status in ('pending','processing')", [payment.id]);
  const updated = (await query('select * from payments where id = $1', [payment.id])).rows[0];
  res.json({ success: true, payment: present(updated) });
});

exports.list = asyncHandler(async (req, res) => {
  const params = [];
  let where = '';
  if (['pending', 'processing', 'successful', 'failed', 'cancelled'].includes(req.query.status)) { params.push(req.query.status); where = 'where p.status = $1'; }
  const { rows } = await query(
    `select p.*, json_build_object('_id', o.id, 'orderNumber', o.order_number) as order_ref,
            json_build_object('_id', u.id, 'name', u.name, 'email', u.email) as buyer_ref
     from payments p join orders o on o.id = p.order_id join users u on u.id = p.buyer_id
     ${where} order by p.created_at desc limit 500`, params
  );
  res.json({ success: true, payments: rows.map(({ order_ref: order, buyer_ref: buyer, ...row }) => ({ ...paymentJson(row), order, buyer })) });
});
