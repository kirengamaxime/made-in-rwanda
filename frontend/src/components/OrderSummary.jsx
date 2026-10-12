import { PAYMENT_METHODS } from '../utils/constants.js';
import { assetUrl, formatDate, formatRWF } from '../utils/format.js';
import StatusBadge from './StatusBadge.jsx';

// Shared read-only order view (buyer, seller and admin). Sellers receive only their own items from the API.
export default function OrderSummary({ order, showFulfillment = false }) {
  const d = order.deliveryInformation;
  const p = order.payment;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-xs text-ink-500">Order</p><p className="font-display text-lg font-bold">{order.orderNumber}</p></div>
        <div className="text-right"><StatusBadge status={order.status} /><p className="mt-1 text-xs text-ink-500">{formatDate(order.createdAt, true)}</p></div>
      </div>
      <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100">
        {order.items.map((it) => (
          <li key={it._id} className="flex items-center gap-3 p-3">
            <img src={assetUrl(it.image)} alt="" className="h-14 w-14 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{it.name}</p>
              <p className="text-xs text-ink-500">{it.quantity} × {formatRWF(it.unitPrice)}</p>
              {showFulfillment && <div className="mt-1"><StatusBadge status={it.fulfillmentStatus} /></div>}
            </div>
            <p className="text-sm font-bold">{formatRWF(it.quantity * it.unitPrice)}</p>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 text-sm">
        {order.sellerTotal === undefined ? (
          <>
            <div className="flex justify-between"><dt className="text-ink-500">Subtotal</dt><dd>{formatRWF(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Delivery</dt><dd>{order.deliveryFee ? formatRWF(order.deliveryFee) : 'Free'}</dd></div>
            <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-extrabold"><dt>Total</dt><dd>{formatRWF(order.totalAmount)}</dd></div>
          </>
        ) : (
          <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-extrabold"><dt>Your items total</dt><dd>{formatRWF(order.sellerTotal)}</dd></div>
        )}
      </dl>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-ink-50 p-4 text-sm">
          <p className="mb-1 font-bold">Delivery</p>
          <p>{d.fullName}</p><p>{d.phone}</p><p>{d.address}</p><p>{d.sector}, {d.district}</p>
          {d.instructions && <p className="mt-1 italic text-ink-500">“{d.instructions}”</p>}
        </div>
        {p && (
          <div className="rounded-lg bg-ink-50 p-4 text-sm">
            <p className="mb-1 font-bold">Payment</p>
            <p>{PAYMENT_METHODS[p.method] || p.method}{p.card?.last4 ? ` •••• ${p.card.last4}` : ''}</p>
            <p className="text-ink-500">Ref: {p.transactionReference}</p>
            <div className="mt-1"><StatusBadge status={p.status} /></div>
            {p.provider === 'simulated' && <p className="mt-2 text-xs text-ink-500">Demo payment - no real money was charged.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
