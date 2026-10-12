import { Link, useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import SignInForm from '../components/SignInForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function SellerLogin() {
  const { sellerLogin } = useAuth();
  const navigate = useNavigate();
  return (
    <SignInForm
      title="Seller sign in"
      subtitle="Use the credentials sent to you by the marketplace team after your application was approved."
      onLogin={sellerLogin}
      onSuccess={() => navigate('/seller', { replace: true })}
      side={(
        <div className="imigongo rounded-2xl p-1">
          <div className="rounded-xl bg-white/95 p-8">
            <Store className="text-brand-700" size={32} />
            <h2 className="mt-3 text-2xl font-extrabold">Sell to all of Rwanda</h2>
            <p className="mt-2 text-ink-500">Seller accounts are created by our team once your application is approved, so there is no sign-up here. Haven’t applied yet?</p>
            <Link to="/become-seller" className="btn-sun mt-5">Become a Seller</Link>
          </div>
        </div>
      )}
      footer={<p>Shopping instead? <Link to="/login" className="font-bold text-brand-700">Buyer sign in</Link></p>}
    />
  );
}
