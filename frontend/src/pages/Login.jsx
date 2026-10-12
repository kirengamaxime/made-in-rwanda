import { Link, useLocation, useNavigate } from 'react-router-dom';
import SignInForm from '../components/SignInForm.jsx';
import { useAuth, homeFor } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;
  return (
    <SignInForm
      title="Welcome back"
      subtitle="Sign in to your buyer account to check out and track orders."
      onLogin={login}
      onSuccess={(u) => navigate(from || homeFor(u.role), { replace: true })}
      footer={(
        <>
          <p>New here? <Link to="/register" className="font-bold text-brand-700">Create an account</Link></p>
          <p className="mt-2">Approved seller? <Link to="/seller/login" className="font-bold text-brand-700">Seller sign in</Link></p>
        </>
      )}
    />
  );
}
