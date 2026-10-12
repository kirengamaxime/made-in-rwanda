import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { categoriesApi, getErrorMessage, getFieldErrors } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import Modal from '../../components/Modal.jsx';
import Field from '../../components/Field.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const EMPTY = { name: '', icon: '🛍️', description: '', subcategories: '', isActive: true };

export default function AdminCategories() {
  const [cats, setCats] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | category
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { toast, confirm } = useUI();

  const load = () => categoriesApi.list(true).then(({ data }) => setCats(data.categories)).catch((e) => { toast.error(getErrorMessage(e)); setCats([]); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (c) => { setEditing(c || 'new'); setErrors({}); setForm(c ? { name: c.name, icon: c.icon, description: c.description || '', subcategories: (c.subcategories || []).join(', '), isActive: c.isActive } : EMPTY); };
  const save = async () => {
    if (form.name.trim().length < 2) { setErrors({ name: 'Enter a category name.' }); return; }
    setBusy(true);
    try {
      if (editing === 'new') await categoriesApi.create(form); else await categoriesApi.update(editing._id, form);
      toast.success('Category saved.'); setEditing(null); load();
    } catch (e) { setErrors(getFieldErrors(e)); toast.error(getErrorMessage(e)); } finally { setBusy(false); }
  };
  const remove = async (c) => {
    if (!(await confirm({ title: `Delete "${c.name}"?`, message: 'Categories that still have products cannot be deleted - deactivate them instead.', confirmText: 'Delete', danger: true }))) return;
    try { await categoriesApi.remove(c._id); toast.success('Category deleted.'); load(); } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const columns = [
    { header: 'Category', render: (c) => <span className="font-semibold"><span className="mr-2 text-lg">{c.icon}</span>{c.name}</span> },
    { header: 'Subcategories', render: (c) => <span className="text-ink-500">{(c.subcategories || []).join(', ') || '-'}</span> },
    { header: 'Products', key: 'productCount' },
    { header: 'Status', render: (c) => <StatusBadge status={c.isActive ? 'active' : 'inactive'} /> },
    { header: 'Actions', render: (c) => (<div className="flex gap-1.5"><button className="btn-outline btn-sm" onClick={() => open(c)}><Pencil size={14} /> Edit</button><button className="btn-outline btn-sm text-red-600" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><Trash2 size={14} /></button></div>) },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">Categories</h1><button className="btn-primary" onClick={() => open(null)}><Plus size={16} /> Add category</button></div>
      <DataTable columns={columns} rows={cats || []} loading={cats === null} empty={{ title: 'No categories yet' }} />
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add category' : 'Edit category'}
        footer={<><button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save category'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <Field label="Icon"><input className="input text-center text-xl" maxLength={4} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></Field>
            <Field label="Name" error={errors.name} required><input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          </div>
          <Field label="Description"><input className="input" maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Subcategories" hint="Comma separated, e.g. Baskets, Pottery, Jewellery"><input className="input" value={form.subcategories} onChange={(e) => setForm({ ...form, subcategories: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active (visible to shoppers and sellers)</label>
        </div>
      </Modal>
    </div>
  );
}
