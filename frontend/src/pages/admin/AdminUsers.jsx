import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../services/api.js';
import { useUI } from '../../context/UIContext.jsx';
import { formatDate } from '../../utils/format.js';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const { toast, confirm } = useUI();
  const load = () => adminApi.users().then(({ data }) => setUsers(data.users)).catch((e) => { toast.error(getErrorMessage(e)); setUsers([]); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => (users || []).filter((u) => !q || `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(q.toLowerCase())), [users, q]);

  const toggle = async (u) => {
    if (!(await confirm({ title: `${u.isActive ? 'Deactivate' : 'Reactivate'} ${u.name}?`, message: u.isActive ? 'They will no longer be able to sign in.' : 'They will be able to sign in again.', confirmText: u.isActive ? 'Deactivate' : 'Reactivate', danger: u.isActive }))) return;
    try { await adminApi.setUserStatus(u._id, !u.isActive); toast.success('Account updated.'); load(); } catch (e) { toast.error(getErrorMessage(e)); }
  };
  const columns = [
    { header: 'Name', key: 'name', className: 'font-semibold' }, { header: 'Email', key: 'email' }, { header: 'Phone', key: 'phone' },
    { header: 'Joined', render: (u) => formatDate(u.createdAt) },
    { header: 'Status', render: (u) => <StatusBadge status={u.isActive ? 'active' : 'inactive'} /> },
    { header: 'Actions', render: (u) => <button className={`btn-outline btn-sm ${u.isActive ? 'text-red-600' : ''}`} onClick={() => toggle(u)}>{u.isActive ? 'Deactivate' : 'Reactivate'}</button> },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Buyers</h1>
      <div className="relative sm:max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" /><input className="input pl-9" placeholder="Search buyers" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search buyers" /></div>
      <DataTable columns={columns} rows={rows} loading={users === null} empty={{ title: 'No buyers found' }} />
    </div>
  );
}
