import { Route, Routes } from 'react-router-dom';
import { LayoutDashboard, Package, PlusCircle, ClipboardList, Store } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import SellerOverview from './SellerOverview.jsx';
import SellerProducts from './SellerProducts.jsx';
import SellerProductForm from './SellerProductForm.jsx';
import SellerOrders from './SellerOrders.jsx';
import SellerProfile from './SellerProfile.jsx';
import NotFound from '../NotFound.jsx';

const NAV = [
  { to: '/seller', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/seller/products', label: 'My Products', icon: Package, end: true },
  { to: '/seller/products/new', label: 'Add Product', icon: PlusCircle },
  { to: '/seller/orders', label: 'Orders', icon: ClipboardList },
  { to: '/seller/profile', label: 'Business profile', icon: Store },
];

export default function SellerDashboard() {
  return (
    <Routes>
      <Route element={<DashboardLayout title="Seller dashboard" nav={NAV} />}>
        <Route index element={<SellerOverview />} />
        <Route path="products" element={<SellerProducts />} />
        <Route path="products/new" element={<SellerProductForm />} />
        <Route path="products/:id/edit" element={<SellerProductForm />} />
        <Route path="orders" element={<SellerOrders />} />
        <Route path="profile" element={<SellerProfile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
