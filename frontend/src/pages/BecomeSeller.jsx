import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Search } from 'lucide-react';
import { applicationsApi, categoriesApi, getErrorMessage, getFieldErrors } from '../services/api.js';
import { DISTRICTS } from '../utils/constants.js';
import { formatDate } from '../utils/format.js';
import { isEmail, normalizePhone } from '../utils/validators.js';
import Field from '../components/Field.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useUI } from '../context/UIContext.jsx';

const EMPTY = { fullName: '', email: '', phone: '', nationalId: '', address: '', district: '', sector: '', businessName: '', businessDescription: '', businessCategory: '', businessLocation: '', businessPhone: '', businessEmail: '', registrationNumber: '' };

function StatusChecker() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const check = async (e) => {
    e.preventDefault(); setResult(null); setError('');
    if (!isEmail(email)) { setError('Enter the email you applied with.'); return; }
    setBusy(true);
    try { const { data } = await applicationsApi.status(email.trim()); setResult(data.application); } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold">Already applied?</h2>
      <p className="text-sm text-ink-500">Check the status of your application.</p>
      <form onSubmit={check} className="mt-3 flex gap-2" noValidate>
        <input className="input" type="email" placeholder="Your application email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Application email" />
        <button className="btn-outline" disabled={busy} aria-label="Check status"><Search size={16} /></button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {result && (
        <div className="mt-3 rounded-lg bg-ink-50 p-3 text-sm">
          <p><strong>{result.businessName}</strong> · submitted {formatDate(result.submittedAt)}</p>
          <div className="mt-1.5"><StatusBadge status={result.status} /></div>
          {result.status === 'pending' && <p className="mt-2 text-ink-500">Our team is reviewing your application.</p>}
          {result.status === 'approved' && <p className="mt-2 text-ink-500">Approved! Use the credentials sent to you on the <Link className="font-bold text-brand-700" to="/seller/login">seller sign-in page</Link>.</p>}
          {result.status === 'rejected' && <p className="mt-2 text-ink-500">Reason: {result.rejectionReason}. You may submit a new application.</p>}
        </div>
      )}
    </div>
  );
}

export default function BecomeSeller() {
  const [form, setForm] = useState(EMPTY);
  const [logo, setLogo] = useState([]);
  const [store, setStore] = useState([]);
  const [extra, setExtra] = useState([]);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const { toast } = useUI();

  useEffect(() => { categoriesApi.list().then(({ data }) => setCategories(data.categories)).catch(() => {}); }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cls = (k) => `input ${errors[k] ? 'input-error' : ''}`;

  const validate = () => {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
    if (!isEmail(form.email)) e.email = 'Enter a valid email address.';
    if (!normalizePhone(form.phone)) e.phone = 'Invalid phone number. Use a Rwanda number such as 0781234567.';
    if (form.nationalId && !/^\d{16}$/.test(form.nationalId.replace(/\s/g, ''))) e.nationalId = 'A Rwandan National ID has 16 digits.';
    if (form.address.trim().length < 3) e.address = 'Enter your address.';
    if (!form.district) e.district = 'Select your district.';
    if (form.sector.trim().length < 2) e.sector = 'Enter your sector.';
    if (form.businessName.trim().length < 2) e.businessName = 'Enter your business name.';
    if (form.businessDescription.trim().length < 20) e.businessDescription = 'Describe your business in at least 20 characters.';
    if (!form.businessCategory) e.businessCategory = 'Select a business category.';
    if (form.businessLocation.trim().length < 3) e.businessLocation = 'Enter your business location.';
    if (!normalizePhone(form.businessPhone)) e.businessPhone = 'Invalid business phone number.';
    if (!isEmail(form.businessEmail)) e.businessEmail = 'Enter a valid business email.';
    if (logo.length < 1) e.logo = 'Upload your business logo.';
    if (store.length < 1) e.storePhoto = 'Upload a photo of your business or store.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error('Please correct the highlighted fields.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (String(v).trim()) fd.append(k, String(v).trim()); });
    fd.append('logo', logo[0].file);
    fd.append('storePhoto', store[0].file);
    extra.forEach((x) => fd.append('images', x.file));
    setBusy(true);
    try {
      const { data } = await applicationsApi.submit(fd);
      setDone(data.message);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="container-page max-w-xl py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700"><CheckCircle2 size={34} /></span>
        <h1 className="mt-5 text-3xl font-extrabold">Application submitted</h1>
        <p className="mt-3 text-ink-700">{done}</p>
        <p className="mt-2 text-sm text-ink-500">Your application is <strong>pending</strong>. You cannot access the seller dashboard until it is approved. If approved, the marketplace team will send you sign-in details.</p>
        <Link to="/" className="btn-primary mt-6">Back to marketplace</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Become a Seller</h1>
        <p className="mt-2 text-ink-500">Tell us about you and your business. Our team reviews every application before a seller account is created.</p>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form onSubmit={submit} noValidate className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold">Personal information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.fullName} htmlFor="s-name" required><input id="s-name" className={cls('fullName')} value={form.fullName} onChange={set('fullName')} autoComplete="name" /></Field>
              <Field label="Email" error={errors.email} htmlFor="s-email" required><input id="s-email" type="email" className={cls('email')} value={form.email} onChange={set('email')} autoComplete="email" /></Field>
              <Field label="Phone number" error={errors.phone} htmlFor="s-phone" required><input id="s-phone" type="tel" className={cls('phone')} value={form.phone} onChange={set('phone')} placeholder="0781234567" /></Field>
              <Field label="National ID number (optional)" error={errors.nationalId} htmlFor="s-nid" hint="Only provide this if you want faster identity verification. We never show it publicly."><input id="s-nid" inputMode="numeric" className={cls('nationalId')} value={form.nationalId} onChange={set('nationalId')} maxLength={19} /></Field>
              <Field label="Address" error={errors.address} htmlFor="s-addr" required className="sm:col-span-2"><input id="s-addr" className={cls('address')} value={form.address} onChange={set('address')} /></Field>
              <Field label="District" error={errors.district} htmlFor="s-dist" required><select id="s-dist" className={cls('district')} value={form.district} onChange={set('district')}><option value="">Select district</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Sector" error={errors.sector} htmlFor="s-sector" required><input id="s-sector" className={cls('sector')} value={form.sector} onChange={set('sector')} /></Field>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold">Business information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Business name" error={errors.businessName} htmlFor="b-name" required><input id="b-name" className={cls('businessName')} value={form.businessName} onChange={set('businessName')} /></Field>
              <Field label="Business category" error={errors.businessCategory} htmlFor="b-cat" required>
                <select id="b-cat" className={cls('businessCategory')} value={form.businessCategory} onChange={set('businessCategory')}><option value="">Select category</option>{categories.map((c) => <option key={c._id}>{c.name}</option>)}</select>
              </Field>
              <Field label="Business description" error={errors.businessDescription} htmlFor="b-desc" required className="sm:col-span-2" hint="What do you make or sell? What makes it special?"><textarea id="b-desc" rows={4} maxLength={2000} className={cls('businessDescription')} value={form.businessDescription} onChange={set('businessDescription')} /></Field>
              <Field label="Business location" error={errors.businessLocation} htmlFor="b-loc" required className="sm:col-span-2"><input id="b-loc" className={cls('businessLocation')} value={form.businessLocation} onChange={set('businessLocation')} placeholder="Sector, District, Province" /></Field>
              <Field label="Business phone" error={errors.businessPhone} htmlFor="b-phone" required><input id="b-phone" type="tel" className={cls('businessPhone')} value={form.businessPhone} onChange={set('businessPhone')} /></Field>
              <Field label="Business email" error={errors.businessEmail} htmlFor="b-email" required><input id="b-email" type="email" className={cls('businessEmail')} value={form.businessEmail} onChange={set('businessEmail')} /></Field>
              <Field label="Business registration number (if applicable)" error={errors.registrationNumber} htmlFor="b-reg" className="sm:col-span-2"><input id="b-reg" className={cls('registrationNumber')} value={form.registrationNumber} onChange={set('registrationNumber')} /></Field>
            </div>
          </section>

          <section className="card space-y-6 p-5 sm:p-6">
            <h2 className="text-lg font-bold">Business images</h2>
            <ImageUploader label="Business logo *" value={logo} onChange={setLogo} max={1} error={errors.logo} />
            <ImageUploader label="Business or store photo *" value={store} onChange={setStore} max={1} error={errors.storePhoto} />
            <ImageUploader label="Additional business and product photos" value={extra} onChange={setExtra} max={6} error={errors.images} />
          </section>

          <button className="btn-primary btn-lg w-full sm:w-auto" disabled={busy}>{busy ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : 'Submit Application'}</button>
        </form>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <StatusChecker />
          <div className="card p-5 text-sm text-ink-700">
            <h2 className="text-lg font-bold">What happens next</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>You submit this application. It is saved as <strong>pending</strong>.</li>
              <li>The marketplace team reviews it.</li>
              <li>If approved, we create your seller account and send you sign-in details.</li>
              <li>Sign in at <Link className="font-bold text-brand-700" to="/seller/login">Seller sign in</Link> and start listing products.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
