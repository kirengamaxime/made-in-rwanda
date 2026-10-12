import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, Info, Loader2, Smartphone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { getErrorMessage, getFieldErrors, ordersApi, paymentsApi, settingsApi } from '../services/api.js';
import { DISTRICTS } from '../utils/constants.js';
import { assetUrl, formatRWF } from '../utils/format.js';
import { cardBrand, expiryValid, formatCardNumber, formatExpiry, isAirtel, isMtn, luhn, normalizePhone } from '../utils/validators.js';
import Field from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';

const METHODS = [
  { id: 'mtn_momo', label: 'MTN MoMo', sub: '078 / 079 numbers', icon: Smartphone, color: 'text-yellow-700 bg-sun-100' },
  { id: 'airtel_money', label: 'Airtel Money', sub: '072 / 073 numbers', icon: Smartphone, color: 'text-red-700 bg-red-50' },
  { id: 'card', label: 'Bank card', sub: 'Visa or Mastercard', icon: CreditCard, color: 'text-sky-700 bg-sky-50' },
];

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const { toast } = useUI();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({ deliveryFee: 0, freeDeliveryThreshold: 0 });
  const [form, setForm] = useState({ fullName: user?.name || '', phone: user?.phone || '', address: '', district: '', sector: '', instructions: '' });
  const [method, setMethod] = useState('mtn_momo');
  const [pay, setPay] = useState({ momoPhone: user?.phone || '', cardholderName: '', cardNumber: '', expiry: '', cvv: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [waiting, setWaiting] = useState(null); // { paymentId }
  const poll = useRef(null);

  useEffect(() => { settingsApi.public().then(({ data }) => setSettings(data.settings)).catch(() => {}); }, []);
  useEffect(() => () => clearInterval(poll.current), []);

  const free = settings.freeDeliveryThreshold > 0 && subtotal >= settings.freeDeliveryThreshold;
  const deliveryFee = free ? 0 : settings.deliveryFee;
  const total = subtotal + deliveryFee;

  if (items.length === 0 && !waiting) {
    return <div className="container-page py-16"><EmptyState title="Your cart is empty" message="Add some products before checking out." action={<Link to="/products" className="btn-primary">Browse products</Link>} /></div>;
  }

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setP = (k, fmt) => (e) => setPay((p) => ({ ...p, [k]: fmt ? fmt(e.target.value) : e.target.value }));

  const validate = () => {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = 'Enter the customer name.';
    if (!normalizePhone(form.phone)) e.phone = 'Invalid phone number. Use a Rwanda number such as 0781234567.';
    if (form.address.trim().length < 3) e.address = 'Enter the delivery address.';
    if (!form.district) e.district = 'Select a district.';
    if (form.sector.trim().length < 2) e.sector = 'Enter the sector.';
    if (method === 'mtn_momo') { const p = normalizePhone(pay.momoPhone); if (!p || !isMtn(p)) e.momoPhone = 'Invalid phone number. MTN MoMo numbers start with 078 or 079.'; }
    if (method === 'airtel_money') { const p = normalizePhone(pay.momoPhone); if (!p || !isAirtel(p)) e.momoPhone = 'Invalid phone number. Airtel Money numbers start with 072 or 073.'; }
    if (method === 'card') {
      const num = pay.cardNumber.replace(/\s/g, '');
      if (pay.cardholderName.trim().length < 2) e.cardholderName = 'Enter the cardholder name.';
      if (!luhn(num) || !cardBrand(num)) e.cardNumber = 'Enter a valid Visa or Mastercard number.';
      if (!expiryValid(pay.expiry)) e.expiry = 'Enter a valid expiry date (MM/YY).';
      if (!/^\d{3}$/.test(pay.cvv)) e.cvv = 'CVV must be 3 digits.';
    }
    return e;
  };

  const finishSuccess = (id) => {
    clear();
    toast.success('Payment successful. Your order is confirmed.');
    navigate(`/orders/${id}`, { replace: true, state: { justPaid: true } });
  };

  const startPolling = (paymentId, oid) => {
    let tries = 0;
    clearInterval(poll.current);
    poll.current = setInterval(async () => {
      tries += 1;
      try {
        const { data } = await paymentsApi.get(paymentId);
        const s = data.payment.status;
        if (s === 'successful') { clearInterval(poll.current); setWaiting(null); finishSuccess(oid); }
        else if (['failed', 'cancelled'].includes(s)) { clearInterval(poll.current); setWaiting(null); setBusy(false); setFormError(`Payment ${s}: ${data.payment.failureReason || 'the request was not approved.'} You have not been charged.`); }
        else if (tries > 60) { clearInterval(poll.current); setWaiting(null); setBusy(false); setFormError('The payment request timed out. You have not been charged. Please try again.'); }
      } catch (err) { /* transient: keep polling */ }
    }, 2000);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error('Please correct the highlighted fields.'); return; }
    setBusy(true);
    try {
      let oid = orderId;
      if (!oid) {
        const { data } = await ordersApi.create({ items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })), delivery: { ...form, phone: normalizePhone(form.phone) } });
        oid = data.order._id;
        setOrderId(oid);
      }
      const body = { orderId: oid, method };
      if (method === 'card') Object.assign(body, { cardholderName: pay.cardholderName.trim(), cardNumber: pay.cardNumber, expiry: pay.expiry, cvv: pay.cvv });
      else body.phone = normalizePhone(pay.momoPhone);
      const { data } = await paymentsApi.create(body);
      setPay((p) => ({ ...p, cardNumber: '', cvv: '' })); // never keep card data in memory longer than needed
      if (data.payment.status === 'successful') finishSuccess(oid);
      else { setWaiting({ paymentId: data.payment._id, orderId: oid }); startPolling(data.payment._id, oid); }
    } catch (err) {
      const fe = getFieldErrors(err);
      const mapped = { ...fe };
      if (fe.phone && (method === 'mtn_momo' || method === 'airtel_money')) mapped.momoPhone = fe.phone;
      setErrors(mapped);
      setFormError(getErrorMessage(err));
      setBusy(false);
      if (err.response?.status === 400 && /stock|not found/i.test(getErrorMessage(err))) setOrderId(null);
    }
  };

  const cancelWaiting = async () => {
    clearInterval(poll.current);
    try { await paymentsApi.cancel(waiting.paymentId); } catch (e) { /* may already be settled */ }
    setWaiting(null); setBusy(false);
    setFormError('Payment cancelled. You have not been charged.');
  };

  const cls = (k) => `input ${errors[k] ? 'input-error' : ''}`;
  const brand = cardBrand(pay.cardNumber.replace(/\s/g, ''));

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-extrabold">Checkout</h1>
      <form onSubmit={submit} noValidate className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {formError && <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">{formError}</div>}

          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold">Delivery details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Customer name" error={errors.fullName} htmlFor="c-name" required><input id="c-name" className={cls('fullName')} value={form.fullName} onChange={setF('fullName')} autoComplete="name" /></Field>
              <Field label="Phone number" error={errors.phone} htmlFor="c-phone" required><input id="c-phone" type="tel" className={cls('phone')} value={form.phone} onChange={setF('phone')} autoComplete="tel" placeholder="0781234567" /></Field>
              <Field label="Delivery address" error={errors.address} htmlFor="c-addr" required className="sm:col-span-2"><input id="c-addr" className={cls('address')} value={form.address} onChange={setF('address')} autoComplete="street-address" placeholder="Street, house number, landmark" /></Field>
              <Field label="District" error={errors.district} htmlFor="c-dist" required>
                <select id="c-dist" className={cls('district')} value={form.district} onChange={setF('district')}><option value="">Select district</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select>
              </Field>
              <Field label="Sector" error={errors.sector} htmlFor="c-sector" required><input id="c-sector" className={cls('sector')} value={form.sector} onChange={setF('sector')} /></Field>
              <Field label="Additional delivery instructions" error={errors.instructions} htmlFor="c-ins" className="sm:col-span-2"><textarea id="c-ins" rows={2} maxLength={500} className={cls('instructions')} value={form.instructions} onChange={setF('instructions')} placeholder="Optional: gate colour, call on arrival…" /></Field>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold">Payment method</h2>
            <div className="mt-3 flex gap-2 rounded-lg bg-sun-100 p-3 text-xs text-yellow-900">
              <Info size={16} className="mt-0.5 shrink-0" />
              <p><strong>Demo mode:</strong> payments are simulated and no real money is charged. Test with any 078/079 or 072/073 number (numbers ending in “00” are declined) or card <span className="font-mono">4242 4242 4242 4242</span> (<span className="font-mono">4000 0000 0000 0002</span> is declined). Any future expiry and 3-digit CVV.</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Payment method">
              {METHODS.map((m) => (
                <button type="button" key={m.id} role="radio" aria-checked={method === m.id} onClick={() => { setMethod(m.id); setErrors({}); }}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${method === m.id ? 'border-brand-700 bg-brand-50' : 'border-ink-100 hover:border-ink-200'}`}>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${m.color}`}><m.icon size={20} /></span>
                  <span><span className="block text-sm font-bold">{m.label}</span><span className="block text-xs text-ink-500">{m.sub}</span></span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              {method !== 'card' ? (
                <Field label={method === 'mtn_momo' ? 'MTN MoMo number' : 'Airtel Money number'} error={errors.momoPhone} htmlFor="p-phone" required hint={method === 'mtn_momo' ? 'e.g. 0781234567 or 0791234567' : 'e.g. 0721234567 or 0731234567'}>
                  <input id="p-phone" type="tel" inputMode="numeric" className={cls('momoPhone')} value={pay.momoPhone} onChange={setP('momoPhone')} placeholder={method === 'mtn_momo' ? '078XXXXXXX' : '072XXXXXXX'} />
                </Field>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Cardholder name" error={errors.cardholderName} htmlFor="p-name" required className="sm:col-span-2"><input id="p-name" autoComplete="cc-name" className={cls('cardholderName')} value={pay.cardholderName} onChange={setP('cardholderName')} /></Field>
                  <Field label="Card number" error={errors.cardNumber} htmlFor="p-num" required className="sm:col-span-2">
                    <div className="relative">
                      <input id="p-num" inputMode="numeric" autoComplete="cc-number" className={`${cls('cardNumber')} pr-24 font-mono`} value={pay.cardNumber} onChange={setP('cardNumber', formatCardNumber)} placeholder="1234 5678 9012 3456" />
                      {brand && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-ink-100 px-2 py-0.5 text-xs font-bold capitalize">{brand}</span>}
                    </div>
                  </Field>
                  <Field label="Expiry date" error={errors.expiry} htmlFor="p-exp" required><input id="p-exp" inputMode="numeric" autoComplete="cc-exp" className={`${cls('expiry')} font-mono`} value={pay.expiry} onChange={setP('expiry', formatExpiry)} placeholder="MM/YY" /></Field>
                  <Field label="CVV" error={errors.cvv} htmlFor="p-cvv" required><input id="p-cvv" inputMode="numeric" autoComplete="cc-csc" type="password" maxLength={3} className={`${cls('cvv')} font-mono`} value={pay.cvv} onChange={setP('cvv', (v) => v.replace(/\D/g, '').slice(0, 3))} placeholder="123" /></Field>
                </div>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500"><ShieldCheck size={14} /> Card numbers and CVV are never stored by this marketplace.</p>
            </div>
          </section>
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Order summary</h2>
          <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
            {items.map((i) => (
              <li key={i.productId} className="flex items-center gap-3">
                <img src={assetUrl(i.image)} alt="" className="h-12 w-12 rounded-md object-cover" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.name}</p><p className="text-xs text-ink-500">{i.quantity} × {formatRWF(i.price)}</p></div>
                <p className="text-sm font-bold">{formatRWF(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Subtotal</dt><dd className="font-semibold">{formatRWF(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Delivery fee</dt><dd className="font-semibold">{deliveryFee ? formatRWF(deliveryFee) : 'Free'}</dd></div>
            {!free && settings.freeDeliveryThreshold > 0 && <p className="text-xs text-brand-700">Free delivery on orders over {formatRWF(settings.freeDeliveryThreshold)}.</p>}
            <div className="flex justify-between border-t border-ink-100 pt-3 text-lg font-extrabold"><dt>Total</dt><dd>{formatRWF(total)}</dd></div>
          </dl>
          <button className="btn-primary btn-lg mt-5 w-full" disabled={busy}>{busy ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : `Pay ${formatRWF(total)}`}</button>
          <Link to="/cart" className="btn-ghost mt-2 w-full">Back to cart</Link>
        </aside>
      </form>

      <Modal open={!!waiting} onClose={() => {}} closeOnBackdrop={false} title="Approve the payment on your phone"
        footer={<button className="btn-outline" onClick={cancelWaiting}>Cancel payment</button>}>
        <div className="flex flex-col items-center py-4 text-center">
          <Loader2 size={40} className="animate-spin text-brand-700" />
          <p className="mt-4 font-bold">Waiting for confirmation…</p>
          <p className="mt-1 text-sm text-ink-500">A payment request for {formatRWF(total)} was sent to {pay.momoPhone}. In production you would enter your PIN on your phone. This demo approves automatically in a few seconds.</p>
        </div>
      </Modal>
    </div>
  );
}
