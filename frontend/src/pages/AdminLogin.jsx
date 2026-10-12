import { Link, useNavigate } from 'react-router-dom';
import SignInForm from '../components/SignInForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  return (
    <SignInForm
      title="Staff sign in"
      subtitle="Admin and manager access to the marketplace dashboard."
      onLogin={adminLogin}
      onSuccess={() => navigate('/admin', { replace: true })}
      footer={<Link to="/" className="font-bold text-brand-700">Back to marketplace</Link>}
    />
  );
}
