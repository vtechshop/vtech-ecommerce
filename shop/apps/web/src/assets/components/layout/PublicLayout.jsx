// FILE: apps/web/src/components/layout/PublicLayout.jsx
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from './Header';
import Footer from './Footer';
import PageTransition from '@/components/common/PageTransition';
import CartDrawer from '@/components/cart/CartDrawer';
import { loadCart, closeCartDrawer } from '@/store/slices/cartSlice';

const PublicLayout = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { drawerOpen, drawerJustAdded } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(loadCart());
  }, [dispatch]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <PageTransition locationKey={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
      <CartDrawer
        isOpen={drawerOpen}
        onClose={() => dispatch(closeCartDrawer())}
        justAdded={drawerJustAdded}
      />
    </div>
  );
};

export default PublicLayout;