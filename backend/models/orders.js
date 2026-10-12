const { query } = require('../config/db');

const ORDER_SELECT = `
  select o.id as "_id", o.order_number as "orderNumber", o.subtotal, o.delivery_fee as "deliveryFee",
         o.total_amount as "totalAmount", o.currency, o.status, o.paid_at as "paidAt",
         o.created_at as "createdAt", o.updated_at as "updatedAt",
         json_build_object('fullName', o.delivery_full_name, 'phone', o.delivery_phone, 'address', o.delivery_address,
                           'district', o.delivery_district, 'sector', o.delivery_sector,
                           'instructions', o.delivery_instructions) as "deliveryInformation",
         json_build_object('_id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone) as buyer,
         case when p.id is null then null else json_build_object(
           '_id', p.id, 'method', p.method, 'status', p.status, 'transactionReference', p.transaction_reference,
           'amount', p.amount, 'currency', p.currency, 'paidAt', p.paid_at, 'phone', p.phone, 'provider', p.provider,
           'card', json_build_object('brand', p.card_brand, 'last4', p.card_last4)) end as payment
  from orders o
  join users u on u.id = o.buyer_id
  left join payments p on p.id = o.payment_id`;

/**
 * Loads orders (with buyer, payment and items attached).
 * @param {string} where  SQL condition without the "where" keyword, e.g. "o.buyer_id = $1"
 */
async function loadOrders(where = 'true', params = [], { orderBy = 'o.created_at desc', limit } = {}) {
  const { rows } = await query(`${ORDER_SELECT} where ${where} order by ${orderBy}${limit ? ` limit ${Number(limit)}` : ''}`, params);
  if (!rows.length) return [];
  const ids = rows.map((r) => r._id);
  const items = await query(
    `select id as "_id", order_id, product_id as product, seller_id as seller, name, image, quantity,
            unit_price as "unitPrice", fulfillment_status as "fulfillmentStatus"
     from order_items where order_id = any($1::uuid[]) order by line_no`,
    [ids]
  );
  const byOrder = {};
  items.rows.forEach((i) => { (byOrder[i.order_id] = byOrder[i.order_id] || []).push((({ order_id, ...rest }) => rest)(i)); });
  return rows.map((r) => ({ ...r, items: byOrder[r._id] || [] }));
}

async function loadOrder(id) {
  const [order] = await loadOrders('o.id = $1', [id]);
  return order || null;
}

module.exports = { loadOrders, loadOrder };
