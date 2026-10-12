import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Field from '../components/Field.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { getErrorMessage, getFieldErrors } from '../services/api.js';
import { isEmail, isStrongPassword, normalizePhone, passwordRules } from '../utils/validators.js';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Enter your full name.';
    if (!isEmail(form.email)) errs.email = 'Enter a valid email address.';
    if (!normalizePhone(form.phone)) errs.phone = 'Invalid phone number. Use a Rwanda number such as 0781234567.';
    if (!isStrongPassword(form.password)) errs.password = 'Password does not meet the requirements below.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim() });
      toast.success('Account created. Welcome to Made in Rwanda!');
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
      setBusy(false);
    }
  };

  const cls = (k) => `input ${errors[k] ? 'input-error' : ''}`;
  return (
    <div className="container-page py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold">Create your account</h1>
          <p className="mt-1 text-sm text-ink-500">Shop products made by Rwandan businesses. Want to sell instead? <Link to="/become-seller" className="font-bold text-brand-700">Apply as a seller</Link>.</p>
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <Field label="Full name" error={errors.name} htmlFor="r-name" required><input id="r-name" autoComplete="name" className={cls('name')} value={form.name} onChange={set('name')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" error={errors.email} htmlFor="r-email" required><input id="r-email" type="email" autoComplete="email" className={cls('email')} value={form.email} onChange={set('email')} /></Field>
              <Field label="Phone number" error={errors.phone} htmlFor="r-phone" required hint="e.g. 0781234567"><input id="r-phone" type="tel" autoComplete="tel" className={cls('phone')} value={form.phone} onChange={set('phone')} /></Field>
            </div>
            <Field label="Password" error={errors.password} htmlFor="r-pass" required><input id="r-pass" type="password" autoComplete="new-password" className={cls('password')} value={form.password} onChange={set('password')} /></Field>
            <ul className="grid grid-cols-2 gap-1 text-xs">
              {passwordRules(form.password).map((r) => <li key={r.label} className={r.ok ? 'text-brand-700' : 'text-ink-500'}>{r.ok ? '✓' : '○'} {r.label}</li>)}
            </ul>
            <Field label="Confirm password" error={errors.confirmPassword} htmlFor="r-conf" required><input id="r-conf" type="password" autoComplete="new-password" className={cls('confirmPassword')} value={form.confirmPassword} onChange={set('confirmPassword')} /></Field>
            <button className="btn-primary w-full" disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Creating account…</> : 'Create account'}</button>
          </form>
        </div>
        <p className="mt-5 text-center text-sm text-ink-500">Already have an account? <Link to="/login" className="font-bold text-brand-700">Sign in</Link></p>
      </div>
    </div>
  );
}
