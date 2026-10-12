import { useEffect, useState } from 'react';
import { getErrorMessage, getFieldErrors, sellersApi } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { assetUrl } from '../../utils/format.js';
import { isEmail, normalizePhone } from '../../utils/validators.js';
import Field from '../../components/Field.jsx';
import ChangePasswordForm from '../../components/ChangePasswordForm.jsx';
import { PageSpinner } from '../../components/Skeleton.jsx';

export default function SellerProfile() {
  const { user } = useAuth();
  const { toast } = useUI();
  const [seller, setSeller] = useState(null);
  const [form, setForm] = useState({ businessDescription: '', businessLocation: '', businessPhone: '', businessEmail: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sellersApi.me().then(({ data }) => {
      setSeller(data.seller);
      const s = data.seller;
      setForm({ businessDescription: s.businessDescription || '', businessLocation: s.businessLocation || '', businessPhone: s.businessPhone || '', businessEmail: s.businessEmail || '' });
    }).catch((e) => toast.error(getErrorMessage(e)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.businessDescription.trim().length < 20) errs.businessDescription = 'Describe your business in at least 20 characters.';
    if (form.businessLocation.trim().length < 3) errs.businessLocation = 'Enter your business location.';
    if (!normalizePhone(form.businessPhone)) errs.businessPhone = 'Invalid phone number.';
    if (!isEmail(form.businessEmail)) errs.businessEmail = 'Enter a valid email.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { const { data } = await sellersApi.updateMe(form); setSeller(data.seller); toast.success('Business profile updated.'); } catch (err) { setErrors(getFieldErrors(err)); toast.error(getErrorMessage(err)); } finally { setBusy(false); }
  };

  if (!seller) return <PageSpinner />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const cls = (k) => `input ${errors[k] ? 'input-error' : ''}`;
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold">Business profile</h1>
      <div className="card flex items-center gap-4 p-5">
        <img src={assetUrl(seller.logo)} alt="" className="h-16 w-16 rounded-full object-cover" />
        <div><p className="font-display text-lg font-bold">{seller.businessName}</p><p className="text-sm text-ink-500">Login: {user.email} · {seller.businessCategory}</p></div>
      </div>
      <form onSubmit={submit} noValidate className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Field label="Business description" error={errors.businessDescription} className="sm:col-span-2"><textarea rows={4} className={cls('businessDescription')} value={form.businessDescription} onChange={set('businessDescription')} /></Field>
        <Field label="Business location" error={errors.businessLocation} className="sm:col-span-2"><input className={cls('businessLocation')} value={form.businessLocation} onChange={set('businessLocation')} /></Field>
        <Field label="Business phone" error={errors.businessPhone}><input type="tel" className={cls('businessPhone')} value={form.businessPhone} onChange={set('businessPhone')} /></Field>
        <Field label="Business email" error={errors.businessEmail}><input type="email" className={cls('businessEmail')} value={form.businessEmail} onChange={set('businessEmail')} /></Field>
        <div className="sm:col-span-2"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </form>
      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">Change password</h2>
        {user.mustChangePassword && <p className="mb-4 rounded-lg bg-sun-100 p-3 text-sm text-yellow-900">You are using a temporary password. Please choose your own.</p>}
        <ChangePasswordForm />
      </div>
    </div>
  );
}
