import { Inbox } from 'lucide-react';
import { Skeleton } from './Skeleton.jsx';

export default function DataTable({ columns, rows = [], loading, rowKey = '_id', empty = { title: 'Nothing here yet', message: '' } }) {
  if (!loading && rows.length === 0) {
    return (
      <div className="card flex flex-col items-center px-6 py-12 text-center">
        <Inbox className="text-ink-300" size={32} />
        <p className="mt-3 font-bold">{empty.title}</p>
        {empty.message && <p className="mt-1 text-sm text-ink-500">{empty.message}</p>}
      </div>
    );
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-ink-100 bg-ink-50 text-xs font-bold text-ink-500">
          <tr>{columns.map((c) => <th key={c.header} className={`px-4 py-3 ${c.className || ''}`}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{columns.map((c) => <td key={c.header} className="px-4 py-3.5"><Skeleton className="h-4 w-full max-w-[140px]" /></td>)}</tr>
            ))
            : rows.map((row) => (
              <tr key={row[rowKey]} className="hover:bg-ink-50/60">
                {columns.map((c) => <td key={c.header} className={`px-4 py-3 align-middle ${c.className || ''}`}>{c.render ? c.render(row) : row[c.key]}</td>)}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
