import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Search, X } from 'lucide-react';
import { applicationsApi, getErrorMessage, getFieldErrors } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import { assetUrl, formatDate } from '../../utils/format.js';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import Field from '../../components/Field.jsx';
import CredentialsModal from '../../components/CredentialsModal.jsx';
import { PageSpinner } from '../../components/Skeleton.jsx';

const TABS = ['pending', 'approved', 'rejected', 'all'];

function Detail({ label, children }) { return <div><dt className="text-xs font-semibold text-ink-500">{label}</dt><dd className="text-sm">{children || '-'}</dd></div>; }

export default function AdminApplications() {
  const [apps, setApps] = useState(null);
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null); // { loading, app }
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [creds, setCreds] = useState(null);
  const [form, setForm] = useState({ loginEmail: '', password: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { toast } = useUI();

  const load = () => applicationsApi.list().then(({ data }) => setApps(data.applications)).catch((e) => { toast.error(getErrorMessage(e)); setApps([]); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => (apps || []).filter((a) => (tab === 'all' || a.status === tab) && (!q || `${a.fullName} ${a.businessName} ${a.email}`.toLowerCase().includes(q.toLowerCase()))), [apps, tab, q]);

  const openDetail = async (a) => {
    setDetail({ loading: true });
    try { const { data } = await applicationsApi.get(a._id); setDetail({ app: data.application }); } catch (e) { toast.error(getErrorMessage(e)); setDetail(null); }
  };
  const openApprove = (a) => { setApproving(a); setForm({ loginEmail: a.email, password: '', reason: '' }); setErrors({}); };
  const openReject = (a) => { setRejecting(a); setForm({ loginEmail: '', password: '', reason: '' }); setErrors({}); };

  const approve = async () => {
    setBusy(true); setErrors({});
    try {
      const { data } = await applicationsApi.approve(approving._id, { loginEmail: form.loginEmail.trim(), password: form.password || undefined });
      setCreds(data.credentials); setApproving(null); setDetail(null);
      toast.success('Application approved. Seller account created.');
      load();
    } catch (e) { setErrors(getFieldErrors(e)); toast.error(getErrorMessage(e)); } finally { setBusy(false); }
  };
  const reject = async () => {
    if (form.reason.trim().length < 5) { setErrors({ reason: 'Please give a reason (at least 5 characters).' }); return; }
    setBusy(true);
    try { await applicationsApi.reject(rejecting._id, { reason: form.reason.trim() }); toast.success('Application rejected.'); setRejecting(null); setDetail(null); load(); } catch (e) { setErrors(getFieldErrors(e)); toast.error(getErrorMessage(e)); } finally { setBusy(false); }
  };

  const columns = [
    { header: 'Applicant', render: (a) => <div><p className="font-semibold">{a.fullName}</p><p className="text-xs text-ink-500">{a.email}</p></div> },
    { header: 'Business', key: 'businessName', className: 'font-semibold' },
    { header: 'Category', key: 'businessCategory' },
    { header: 'Phone', key: 'phone' },
    { header: 'Applied', render: (a) => formatDate(a.createdAt) },
    { header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { header: 'Actions', render: (a) => (
      <div className="flex gap-1.5">
        <button className="btn-outline btn-sm" onClick={() => openDetail(a)}><Eye size={14} /> View</button>
        {a.status === 'pending' && (<>
          <button className="btn-primary btn-sm" onClick={() => openApprove(a)}><Check size={14} /> Approve</button>
          <button className="btn-outline btn-sm text-red-600" onClick={() => openReject(a)}><X size={14} /> Reject</button>
        </>)}
      </div>) },
  ];
  const a = detail?.app;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Seller applications</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-ink-100 p-1" role="tablist">
          {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize ${tab === t ? 'bg-white shadow-sm' : 'text-ink-500'}`}>{t}{apps && t !== 'all' ? ` (${apps.filter((x) => x.status === t).length})` : ''}</button>)}
        </div>
        <div className="relative w-full sm:w-64"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" /><input className="input pl-9" placeholder="Search applicants" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search applications" /></div>
      </div>
      <DataTable columns={columns} rows={rows} loading={apps === null} empty={{ title: `No ${tab === 'all' ? '' : tab} applications`, message: 'New applications from the “Become a Seller” page appear here.' }} />

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Application details" wide
        footer={a && a.status === 'pending' ? (<><button className="btn-outline text-red-600" onClick={() => openReject(a)}>Reject</button><button className="btn-primary" onClick={() => openApprove(a)}>Approve</button></>) : null}>
        {!a ? <PageSpinner /> : (
          <div className="space-y-5">
            <div className="flex items-center gap-3"><img src={assetUrl(a.logo)} alt="" className="h-14 w-14 rounded-full object-cover" /><div><p className="font-display text-lg font-bold">{a.businessName}</p><StatusBadge status={a.status} /></div></div>
            {a.status === 'rejected' && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800"><strong>Rejected:</strong> {a.rejectionReason}</p>}
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Full name">{a.fullName}</Detail><Detail label="Email">{a.email}</Detail><Detail label="Phone">{a.phone}</Detail>
              <Detail label="National ID">{a.nationalId}</Detail><Detail label="Address">{a.address}</Detail><Detail label="District / Sector">{a.district} / {a.sector}</Detail>
              <Detail label="Business category">{a.businessCategory}</Detail><Detail label="Business location">{a.businessLocation}</Detail>
              <Detail label="Business phone">{a.businessPhone}</Detail><Detail label="Business email">{a.businessEmail}</Detail>
              <Detail label="Registration number">{a.registrationNumber}</Detail><Detail label="Applied">{formatDate(a.createdAt, true)}</Detail>
              <div className="sm:col-span-2"><Detail label="Description"><span className="whitespace-pre-line">{a.businessDescription}</span></Detail></div>
              {a.reviewedBy && <Detail label="Reviewed by">{a.reviewedBy.name} on {formatDate(a.reviewedAt, true)}</Detail>}
            </dl>
            <div>
              <p className="mb-2 text-xs font-semibold text-ink-500">Photos</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {[a.storePhoto, ...(a.businessImages || [])].filter((x, i, arr) => x && arr.indexOf(x) === i).map((src) => <a key={src} href={assetUrl(src)} target="_blank" rel="noreferrer"><img src={assetUrl(src)} alt="Business" className="aspect-square w-full rounded-lg object-cover" /></a>)}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!approving} onClose={() => setApproving(null)} title="Approve application"
        footer={<><button className="btn-outline" onClick={() => setApproving(null)}>Cancel</button><button className="btn-primary" onClick={approve} disabled={busy}>{busy ? 'Creating…' : 'Approve & create seller account'}</button></>}>
        {approving && (
          <div className="space-y-4">
            <p className="text-sm text-ink-700">Approving <strong>{approving.businessName}</strong> creates a seller account. You will receive the login details once to share with the applicant.</p>
            <Field label="Seller login email" error={errors.loginEmail} hint="Defaults to the applicant’s email."><input type="email" className="input" value={form.loginEmail} onChange={(e) => setForm({ ...form, loginEmail: e.target.value })} /></Field>
            <Field label="Temporary password (optional)" error={errors.password} hint="Leave blank to generate a strong password automatically."><input type="text" className="input font-mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="off" /></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject application"
        footer={<><button className="btn-outline" onClick={() => setRejecting(null)}>Cancel</button><button className="btn-danger" onClick={reject} disabled={busy}>{busy ? 'Rejecting…' : 'Reject application'}</button></>}>
        {rejecting && (
          <Field label="Reason for rejection" error={errors.reason} hint="This is shown to the applicant when they check their status." required>
            <textarea rows={4} maxLength={1000} className={`input ${errors.reason ? 'input-error' : ''}`} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </Field>
        )}
      </Modal>
      <CredentialsModal credentials={creds} onClose={() => setCreds(null)} />
    </div>
  );
}
