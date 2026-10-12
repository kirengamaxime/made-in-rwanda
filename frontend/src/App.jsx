import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Products from './pages/Products.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetails from './pages/OrderDetails.jsx';
import Profile from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import BecomeSeller from './pages/BecomeSeller.jsx';
import SellerLogin from './pages/SellerLogin.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import NotFound from './pages/NotFound.jsx';
import SellerDashboard from './pages/seller/SellerDashboard.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60);
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

const PublicLayout = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1"><Outlet /></main>
    <Footer />
  </div>
);

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/become-seller" element={<BecomeSeller />} />
          <Route path="/seller/login" element={<SellerLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<ProtectedRoute roles={['buyer']} />}>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Seller area: approved sellers only */}
        <Route element={<ProtectedRoute roles={['seller']} loginPath="/seller/login" />}>
          <Route path="/seller/*" element={<SellerDashboard />} />
        </Route>

        {/* Admin / manager area */}
        <Route element={<ProtectedRoute roles={['admin', 'manager']} loginPath="/admin/login" />}>
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Route>
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
