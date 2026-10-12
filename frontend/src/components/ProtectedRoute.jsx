import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { PageSpinner } from './Skeleton.jsx';

export function Forbidden() {
  const { user } = useAuth();
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600"><ShieldAlert size={30} /></span>
      <h1 className="text-2xl font-extrabold">Access denied</h1>
      <p className="mt-2 max-w-md text-ink-500">Your account does not have permission to view this page.</p>
      <Link to={user ? homeFor(user.role) : '/'} className="btn-primary mt-6">Go to my home page</Link>
    </div>
  );
}

// Frontend guard (UX only). The API enforces the same rules independently.
export default function ProtectedRoute({ roles, loginPath = '/login' }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to={loginPath} state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Forbidden />;
  return <Outlet />;
}
