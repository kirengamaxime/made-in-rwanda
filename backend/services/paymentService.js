/**
 * Payment provider abstraction.
 *
 * Only the "simulated" provider is implemented: it NEVER moves real money.
 * To go live, add a provider object with the same interface (see "PRODUCTION" in README)
 * for a Rwanda-capable gateway (e.g. Flutterwave, Pesapal, DPO Pay, Paypack, IremboPay)
 * and register it in `providers` below, then set PAYMENT_PROVIDER.
 *
 * Provider interface:
 *   initiate({ payment, method, input }) -> { status, providerReference, failureReason? }
 *   checkStatus(payment)                 -> { status, failureReason? }   (for async mobile money)
 *   cancel(payment)                      -> Promise<void>
 *
 * SECURITY: `input` may hold raw card data. It is used in memory only, passed to the provider,
 * and must never be logged or persisted. Real gateways should tokenize card data client-side
 * (hosted fields / redirect) so card numbers never reach this server at all.
 */
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const v = require('../utils/validators');
const { paymentProvider } = require('../config/env');

const METHODS = ['mtn_momo', 'airtel_money', 'card'];

// Validates and returns ONLY what is safe to persist (+ transient card data for the provider).
function validatePaymentInput(method, body) {
  if (!METHODS.includes(method)) throw new AppError('Invalid payment information: unsupported payment method.', 400, { method: 'Choose a payment method.' });
  const errors = {};
  const safe = {};
  const transient = {};

  if (method === 'mtn_momo' || method === 'airtel_money') {
    const phone = v.normalizePhone(body.phone);
    if (!phone) errors.phone = 'Invalid phone number. Use a Rwanda number such as 0781234567.';
    else if (method === 'mtn_momo' && !v.isMtnPhone(phone)) errors.phone = 'Invalid phone number. MTN MoMo numbers start with 078 or 079.';
    else if (method === 'airtel_money' && !v.isAirtelPhone(phone)) errors.phone = 'Invalid phone number. Airtel Money numbers start with 072 or 073.';
    else safe.phone = phone;
  } else {
    const number = v.isString(body.cardNumber) ? body.cardNumber.replace(/\s/g, '') : '';
    const brand = v.cardBrand(number);
    if (!v.isNonEmpty(body.cardholderName, 2, 80)) errors.cardholderName = 'Enter the cardholder name.';
    if (!v.luhnValid(number) || !brand) errors.cardNumber = 'Enter a valid Visa or Mastercard number.';
    if (!v.expiryValid(body.expiry)) errors.expiry = 'Enter a valid expiry date (MM/YY).';
    if (!v.isString(body.cvv) || !/^\d{3}$/.test(body.cvv)) errors.cvv = 'CVV must be 3 digits.';
    if (!Object.keys(errors).length) {
      safe.card = { brand, last4: number.slice(-4) };
      transient.cardNumber = number;
    }
  }
  if (Object.keys(errors).length) throw new AppError('Invalid payment information', 400, errors);
  return { safe, transient };
}

const ref = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const simulatedProvider = {
  name: 'simulated',
  simulated: true,
  async initiate({ method, input }) {
    if (method === 'card') {
      // Test cards: any valid Visa/Mastercard succeeds, numbers ending in 0002 are declined.
      const declined = input.cardNumber.endsWith('0002');
      return {
        status: declined ? 'failed' : 'successful',
        providerReference: ref('SIM-CARD'),
        failureReason: declined ? 'Card declined by issuer (simulated).' : undefined,
      };
    }
    return { status: 'processing', providerReference: ref('SIM-MOMO') };
  },
  async checkStatus(payment) {
    // Simulated wallet prompt: customer "approves" after ~3s. Numbers ending in "00" are declined.
    if (Date.now() - new Date(payment.createdAt).getTime() < 3000) return { status: 'processing' };
    if (payment.phone && payment.phone.endsWith('00')) {
      return { status: 'failed', failureReason: 'The payment request was declined on the phone (simulated).' };
    }
    return { status: 'successful' };
  },
  async cancel() { return undefined; },
};

const providers = { simulated: simulatedProvider };
const provider = providers[paymentProvider];
if (!provider) {
  console.error(`[payments] Unknown PAYMENT_PROVIDER "${paymentProvider}". Implemented providers: ${Object.keys(providers).join(', ')}`);
  process.exit(1);
}
if (provider.simulated) console.log('[payments] SIMULATED payment provider active - no real money is processed.');

module.exports = { provider, validatePaymentInput, newReference: () => ref('MRW') };
