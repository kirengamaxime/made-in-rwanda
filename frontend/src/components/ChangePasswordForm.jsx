import { useState } from 'react';
import { authApi, getErrorMessage, getFieldErrors } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { isStrongPassword, passwordRules } from '../utils/validators.js';
import Field from './Field.jsx';

export default function ChangePasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const { toast } = useUI();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = 'Enter your current password.';
    if (!isStrongPassword(form.newPassword)) errs.newPassword = 'Password does not meet the requirements below.';
    if (form.newPassword !== form.confirm) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const { data } = await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setUser(data.user);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password updated.');
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Current password" error={errors.currentPassword} htmlFor="cp-cur"><input id="cp-cur" type="password" autoComplete="current-password" className={`input ${errors.currentPassword ? 'input-error' : ''}`} value={form.currentPassword} onChange={set('currentPassword')} /></Field>
      <Field label="New password" error={errors.newPassword} htmlFor="cp-new"><input id="cp-new" type="password" autoComplete="new-password" className={`input ${errors.newPassword ? 'input-error' : ''}`} value={form.newPassword} onChange={set('newPassword')} /></Field>
      <ul className="grid grid-cols-2 gap-1 text-xs">
        {passwordRules(form.newPassword).map((r) => <li key={r.label} className={r.ok ? 'text-brand-700' : 'text-ink-500'}>{r.ok ? '✓' : '○'} {r.label}</li>)}
      </ul>
      <Field label="Confirm new password" error={errors.confirm} htmlFor="cp-conf"><input id="cp-conf" type="password" autoComplete="new-password" className={`input ${errors.confirm ? 'input-error' : ''}`} value={form.confirm} onChange={set('confirm')} /></Field>
      <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
    </form>
  );
}
