import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink-900 text-ink-200">
      <div className="imigongo-band" />
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-300">A marketplace for quality products from talented Rwandan businesses and entrepreneurs. Every purchase supports local makers.</p>
          <ul className="mt-4 space-y-1.5 text-sm text-ink-300">
            <li className="flex items-center gap-2"><MapPin size={15} /> Kigali, Rwanda</li>
            <li className="flex items-center gap-2"><Phone size={15} /> 0780 000 000</li>
            <li className="flex items-center gap-2"><Mail size={15} /> support@madeinrwanda.rw</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-white">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/products">All products</Link></li>
            <li><Link className="hover:text-white" to="/#categories">Categories</Link></li>
            <li><Link className="hover:text-white" to="/cart">Cart</Link></li>
            <li><Link className="hover:text-white" to="/orders">My orders</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-white">Sell with us</h4>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/become-seller">Become a seller</Link></li>
            <li><Link className="hover:text-white" to="/seller/login">Seller sign in</Link></li>
            <li><Link className="hover:text-white" to="/admin/login">Staff sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-ink-300">© {new Date().getFullYear()} Made in Rwanda Marketplace. Prices in Rwandan francs (RWF).</div>
    </footer>
  );
}
