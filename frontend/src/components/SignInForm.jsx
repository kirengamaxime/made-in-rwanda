import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { getErrorMessage } from '../services/api.js';
import { isEmail } from '../utils/validators.js';
import Field from './Field.jsx';

export default function SignInForm({ title, subtitle, onLogin, onSuccess, footer, side }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!isEmail(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Enter your password.';
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const user = await onLogin({ email: form.email.trim(), password: form.password });
      onSuccess(user);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to sign in.'));
      setBusy(false);
    }
  };

  return (
    <div className="container-page grid min-h-[70vh] items-center gap-10 py-12 lg:grid-cols-2">
      {side && <div className="hidden lg:block">{side}</div>}
      <div className="mx-auto w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          {formError && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">{formError}</div>}
          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <Field label="Email" error={errors.email} htmlFor="si-email">
              <input id="si-email" type="email" autoComplete="username" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </Field>
            <Field label="Password" error={errors.password} htmlFor="si-pass">
              <div className="relative">
                <input id="si-pass" type={show ? 'text' : 'password'} autoComplete="current-password" className={`input pr-10 ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </Field>
            <button className="btn-primary w-full" disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign in'}</button>
          </form>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-ink-500">{footer}</div>}
      </div>
    </div>
  );
}
