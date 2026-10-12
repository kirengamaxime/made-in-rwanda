import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { categoriesApi, getErrorMessage, getFieldErrors, productsApi } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Field from '../../components/Field.jsx';
import ImageUploader from '../../components/ImageUploader.jsx';
import { PageSpinner } from '../../components/Skeleton.jsx';

export default function SellerProductForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const { toast } = useUI();
  const { seller } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', category: '', subcategory: '', location: seller?.businessLocation || '', status: 'active' });
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    categoriesApi.list().then(({ data }) => setCategories(data.categories)).catch(() => {});
    if (editing) {
      productsApi.get(id).then(({ data }) => {
        const p = data.product;
        setForm({ name: p.name, description: p.description, price: String(p.price), stock: String(p.stock), category: p.category._id, subcategory: p.subcategory || '', location: p.location || '', status: p.status });
        setImages(p.images.map((url) => ({ key: url, url })));
      }).catch((e) => { toast.error(getErrorMessage(e)); navigate('/seller/products'); }).finally(() => setLoading(false));
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cls = (k) => `input ${errors[k] ? 'input-error' : ''}`;
  const subs = categories.find((c) => c._id === form.category)?.subcategories || [];

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Enter a product name.';
    if (form.description.trim().length < 10) errs.description = 'Description must be at least 10 characters.';
    if (!/^\d+$/.test(form.price) || Number(form.price) < 1) errs.price = 'Enter a price in whole RWF.';
    if (!/^\d+$/.test(form.stock)) errs.stock = 'Enter the stock quantity (0 or more).';
    if (!form.category) errs.category = 'Select a category.';
    if (images.length < 1) errs.images = 'Add at least one image.';
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error('Please correct the highlighted fields.'); return; }

    const fd = new FormData();
    ['name', 'description', 'price', 'stock', 'category', 'subcategory', 'location', 'status'].forEach((k) => fd.append(k, String(form[k]).trim()));
    fd.append('keepImages', JSON.stringify(images.filter((i) => !i.file).map((i) => i.url)));
    images.filter((i) => i.file).forEach((i) => fd.append('images', i.file));
    setBusy(true);
    try {
      if (editing) await productsApi.update(id, fd); else await productsApi.create(fd);
      toast.success(editing ? 'Product updated.' : 'Product added.');
      navigate('/seller/products');
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
      setBusy(false);
    }
  };

  if (loading) return <PageSpinner />;
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold">{editing ? 'Edit product' : 'Add product'}</h1>
      <form onSubmit={submit} noValidate className="mt-5 space-y-6">
        <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Product name" error={errors.name} htmlFor="pr-name" required className="sm:col-span-2"><input id="pr-name" maxLength={120} className={cls('name')} value={form.name} onChange={set('name')} /></Field>
          <Field label="Description" error={errors.description} htmlFor="pr-desc" required className="sm:col-span-2"><textarea id="pr-desc" rows={5} maxLength={4000} className={cls('description')} value={form.description} onChange={set('description')} /></Field>
          <Field label="Price (RWF)" error={errors.price} htmlFor="pr-price" required><input id="pr-price" inputMode="numeric" className={cls('price')} value={form.price} onChange={set('price')} placeholder="25000" /></Field>
          <Field label="Stock quantity" error={errors.stock} htmlFor="pr-stock" required><input id="pr-stock" inputMode="numeric" className={cls('stock')} value={form.stock} onChange={set('stock')} /></Field>
          <Field label="Category" error={errors.category} htmlFor="pr-cat" required>
            <select id="pr-cat" className={cls('category')} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subcategory: '' }))}><option value="">Select category</option>{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
          </Field>
          <Field label="Subcategory" error={errors.subcategory} htmlFor="pr-sub">
            <select id="pr-sub" className={cls('subcategory')} value={form.subcategory} onChange={set('subcategory')} disabled={!subs.length}><option value="">{subs.length ? 'Select subcategory' : 'None available'}</option>{subs.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
          <Field label="Product location" htmlFor="pr-loc"><input id="pr-loc" className="input" value={form.location} onChange={set('location')} /></Field>
          <Field label="Status" htmlFor="pr-status" hint="Inactive products are hidden from the marketplace.">
            <select id="pr-status" className="input" value={form.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select>
          </Field>
        </section>
        <section className="card p-5 sm:p-6">
          <ImageUploader label="Product images *" value={images} onChange={setImages} max={6} error={errors.images} hint="The first image is the main photo. JPG, PNG or WEBP, up to 5MB each, max 6 images." />
        </section>
        <div className="flex gap-3">
          <button className="btn-primary btn-lg" disabled={busy}>{busy ? <><Loader2 size={18} className="animate-spin" /> Saving…</> : editing ? 'Save changes' : 'Add product'}</button>
          <button type="button" className="btn-outline btn-lg" onClick={() => navigate('/seller/products')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
