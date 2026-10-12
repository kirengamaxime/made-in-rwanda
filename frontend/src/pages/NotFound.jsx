import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-7xl font-extrabold text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-ink-500">The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
