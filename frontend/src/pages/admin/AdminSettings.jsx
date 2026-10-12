import { useEffect, useState } from 'react';
import { adminApi, getErrorMessage, getFieldErrors } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import Field from '../../components/Field.jsx';
import { PageSpinner } from '../../components/Skeleton.jsx';

export default function AdminSettings() {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { toast } = useUI();
  useEffect(() => { adminApi.getSettings().then(({ data }) => { const s = data.settings; setForm({ marketplaceName: s.marketplaceName, supportEmail: s.supportEmail, supportPhone: s.supportPhone, deliveryFee: String(s.deliveryFee), freeDeliveryThreshold: String(s.freeDeliveryThreshold) }); }).catch((e) => toast.error(getErrorMessage(e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try { await adminApi.updateSettings(form); toast.success('Settings saved.'); } catch (err) { setErrors(getFieldErrors(err)); toast.error(getErrorMessage(err)); } finally { setBusy(false); }
  };
  if (!form) return <PageSpinner />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const cls = (k) => `input ${errors[k] ? 'input-error' : ''}`;
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold">Marketplace settings</h1>
      <form onSubmit={save} className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6" noValidate>
        <Field label="Marketplace name" error={errors.marketplaceName} className="sm:col-span-2"><input className={cls('marketplaceName')} value={form.marketplaceName} onChange={set('marketplaceName')} /></Field>
        <Field label="Support email" error={errors.supportEmail}><input type="email" className={cls('supportEmail')} value={form.supportEmail} onChange={set('supportEmail')} /></Field>
        <Field label="Support phone" error={errors.supportPhone}><input type="tel" className={cls('supportPhone')} value={form.supportPhone} onChange={set('supportPhone')} /></Field>
        <Field label="Delivery fee (RWF)" error={errors.deliveryFee}><input inputMode="numeric" className={cls('deliveryFee')} value={form.deliveryFee} onChange={set('deliveryFee')} /></Field>
        <Field label="Free delivery above (RWF)" error={errors.freeDeliveryThreshold} hint="Set to 0 to disable free delivery."><input inputMode="numeric" className={cls('freeDeliveryThreshold')} value={form.freeDeliveryThreshold} onChange={set('freeDeliveryThreshold')} /></Field>
        <div className="sm:col-span-2"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
      </form>
    </div>
  );
}
