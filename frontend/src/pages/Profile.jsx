import { useState } from 'react';
import { authApi, getErrorMessage, getFieldErrors } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { normalizePhone } from '../utils/validators.js';
import Field from '../components/Field.jsx';
import ChangePasswordForm from '../components/ChangePasswordForm.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { toast } = useUI();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Enter your full name.';
    if (!normalizePhone(form.phone)) errs.phone = 'Invalid phone number.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { const { data } = await authApi.updateProfile(form); setUser(data.user); toast.success('Profile updated.'); } catch (err) { setErrors(getFieldErrors(err)); toast.error(getErrorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="text-3xl font-extrabold">My profile</h1>
      <form onSubmit={submit} className="card mt-6 space-y-4 p-5 sm:p-6" noValidate>
        <h2 className="text-lg font-bold">Personal details</h2>
        <Field label="Email" hint="Email cannot be changed."><input className="input" value={user.email} disabled /></Field>
        <Field label="Full name" error={errors.name} htmlFor="pf-name"><input id="pf-name" className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Phone number" error={errors.phone} htmlFor="pf-phone"><input id="pf-phone" type="tel" className={`input ${errors.phone ? 'input-error' : ''}`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
      <div className="card mt-6 p-5 sm:p-6"><h2 className="mb-4 text-lg font-bold">Change password</h2><ChangePasswordForm /></div>
    </div>
  );
}
