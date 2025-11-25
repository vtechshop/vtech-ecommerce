// FILE: apps/web/src/components/layout/PublicLayout.jsx
import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Header from './Header';
import Footer from './Footer';
import { loadCart } from '@/store/slices/cartSlice';

const PublicLayout = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadCart());
  }, [dispatch]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;