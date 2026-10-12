import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import { assetUrl, formatDate } from '../../utils/format.js';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import CredentialsModal from '../../components/CredentialsModal.jsx';

export default function AdminSellers() {
  const [sellers, setSellers] = useState(null);
  const [creds, setCreds] = useState(null);
  const { toast, confirm } = useUI();
  const load = () => adminApi.sellers().then(({ data }) => setSellers(data.sellers)).catch((e) => { toast.error(getErrorMessage(e)); setSellers([]); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (s) => {
    const next = s.status === 'approved' ? 'suspended' : 'approved';
    if (!(await confirm({ title: `${next === 'suspended' ? 'Suspend' : 'Reactivate'} ${s.businessName}?`, message: next === 'suspended' ? 'The seller will be unable to sign in and their products will be hidden from the marketplace.' : 'The seller can sign in again and their products become visible.', confirmText: next === 'suspended' ? 'Suspend seller' : 'Reactivate', danger: next === 'suspended' }))) return;
    try { await adminApi.setSellerStatus(s._id, next); toast.success(`Seller ${next === 'suspended' ? 'suspended' : 'reactivated'}.`); load(); } catch (e) { toast.error(getErrorMessage(e)); }
  };
  const reset = async (s) => {
    if (!(await confirm({ title: 'Generate new credentials?', message: `A new temporary password will be created for ${s.businessName}. The old password stops working immediately.`, confirmText: 'Generate password' }))) return;
    try { const { data } = await adminApi.resetCredentials(s._id); setCreds(data.credentials); } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const columns = [
    { header: 'Seller', render: (s) => <div className="flex items-center gap-3"><img src={assetUrl(s.logo)} alt="" className="h-9 w-9 rounded-full object-cover" /><span className="font-semibold">{s.user?.name}</span></div> },
    { header: 'Business', key: 'businessName', className: 'font-semibold' },
    { header: 'Email', render: (s) => s.user?.email },
    { header: 'Phone', render: (s) => s.businessPhone || s.user?.phone },
    { header: 'Products', key: 'productCount' },
    { header: 'Since', render: (s) => formatDate(s.createdAt) },
    { header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { header: 'Actions', render: (s) => (
      <div className="flex gap-1.5">
        <button className={`btn-outline btn-sm ${s.status === 'approved' ? 'text-red-600' : ''}`} onClick={() => toggle(s)}>{s.status === 'approved' ? 'Suspend' : 'Reactivate'}</button>
        <button className="btn-outline btn-sm" onClick={() => reset(s)} title="Generate new credentials"><KeyRound size={14} /> Reset</button>
      </div>) },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Sellers</h1>
      <DataTable columns={columns} rows={sellers || []} loading={sellers === null} empty={{ title: 'No sellers yet', message: 'Approve a seller application to create the first seller.' }} />
      <CredentialsModal credentials={creds} onClose={() => setCreds(null)} />
    </div>
  );
}
