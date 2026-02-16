// FILE: apps/web/src/components/layout/PublicLayout.jsx
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Header from './Header';
import Footer from './Footer';
import PageTransition from '@/components/common/PageTransition';
import { loadCart } from '@/store/slices/cartSlice';

const PublicLayout = () => {
  const dispatch = useDispatch();
  const location = useLocation();

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
    </div>
  );
};

export default PublicLayout;