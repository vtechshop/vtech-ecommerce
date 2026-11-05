import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Loader2, AlertTriangle } from 'lucide-react';
import api from '@/utils/api';
import { loadCart } from '@/store/slices/cartSlice';
import { NoIndex } from '@/components/common/SEO';
import { STOREFRONTS } from '@/utils/storefronts';

// Written by the API landing page (/api/woo/landing) on this same origin
const TOKEN_KEY = 'vtech_woo_handoff';
const ERROR_KEY = 'vtech_woo_handoff_error';

const EXPIRED = {
  title: 'This checkout link has expired',
  message: 'Checkout links work once and expire after 30 minutes. Go back to the store and select Proceed to VTech Checkout again. Your store cart has not been changed.',
};

function takeHandoff() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const error = sessionStorage.getItem(ERROR_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ERROR_KEY);
    return { token, error };
  } catch {
    return { token: null, error: 'STORAGE_UNAVAILABLE' };
  }
}

function toFailure(err) {
  const body = err.response?.data?.error;
  if (body?.code === 'CART_NOT_TRANSFERABLE') {
    return {
      title: 'Some products cannot be checked out here',
      message: 'Nothing was added to your VTech Kitchen cart. Remove these products from your store cart, then try again.',
      items: body.items || [],
      storefront: STOREFRONTS[body.externalSource],
    };
  }
  if (body?.code === 'TOKEN_INVALID' || body?.code === 'INVALID_TOKEN') return EXPIRED;
  if (body?.code === 'IMPORT_IN_PROGRESS' || body?.code === 'CART_BUSY') {
    return { title: 'Your cart is still being transferred', message: 'Open your VTech Kitchen cart in a moment to check it.', showCart: true };
  }
  return { title: 'We could not transfer your cart', message: 'Check your connection, then go back to the store and try again. Your store cart has not been changed.' };
}

export default function WooCheckout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const started = useRef(false);
  const [failure, setFailure] = useState(null);

  useEffect(() => {
    // Read and clear the token exactly once (StrictMode runs effects twice in development)
    if (started.current) return;
    started.current = true;

    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    window.history.replaceState(null, '', window.location.pathname);

    const { token } = takeHandoff();
    if (!token) {
      setFailure(EXPIRED);
      return () => meta.remove();
    }

    api.post('/woo/cart/import', { token })
      .then(async () => {
        await dispatch(loadCart());
        navigate('/checkout', { replace: true });
      })
      .catch((err) => setFailure(toFailure(err)));

    return () => meta.remove();
  }, [dispatch, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <NoIndex />
      {!failure ? (
        <div className="text-center" role="status">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Moving your cart to VTech Kitchen checkout…</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-lg w-full">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{failure.title}</h1>
              <p className="text-sm text-gray-600 mt-1">{failure.message}</p>
            </div>
          </div>

          {failure.items?.length > 0 && (
            <ul className="text-sm border border-gray-100 rounded-lg divide-y divide-gray-100 mb-4">
              {failure.items.map((item, i) => (
                <li key={i} className="px-3 py-2">
                  <span className="font-mono text-xs text-gray-500">
                    Store product {item.wooProductId || '—'}{item.wooVariantId ? `, option ${item.wooVariantId}` : ''}
                  </span>
                  <span className="block text-gray-800">{item.message}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            {failure.storefront && (
              <a href={failure.storefront.cartUrl} rel="noreferrer"
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Back to {failure.storefront.name} cart
              </a>
            )}
            <Link to={failure.showCart ? '/cart' : '/'}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
              {failure.showCart ? 'Open VTech Kitchen cart' : 'Go to VTech Kitchen'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
