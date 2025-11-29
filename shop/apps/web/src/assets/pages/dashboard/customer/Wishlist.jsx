// FILE: apps/web/src/pages/dashboard/customer/Wishlist.jsx
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import api from '@/utils/api';
import { addToCart } from '@/store/slices/cartSlice';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/format';

const Wishlist = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const response = await api.get('/user/wishlist');
      return response.data.data;
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (productId) => {
      await api.delete(`/user/wishlist/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const handleAddToCart = async (product) => {
    try {
      await dispatch(addToCart({
        productId: product._id,
        quantity: 1,
      })).unwrap();
      // Success - cart count will update automatically via Redux
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const handleRemove = (productId) => {
    removeMutation.mutate(productId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>

      {wishlist && wishlist.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map((product) => (
            <div key={product._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <Link to={`/product/${product.slug}`}>
                <div className="aspect-square bg-gray-100">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link to={`/product/${product.slug}`}>
                  <h3 className="font-semibold mb-2 line-clamp-2 hover:text-gray-600">
                    {product.title}
                  </h3>
                </Link>
                <p className="text-xl font-bold text-blue-600 mb-4">
                  {formatCurrency(product.price)}
                </p>
                {product.stock > 0 ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAddToCart(product)}
                      variant="primary"
                      size="sm"
                      fullWidth
                    >
                      Add to Cart
                    </Button>
                    <button
                      onClick={() => handleRemove(product._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-red-600 text-sm mb-2">Out of Stock</p>
                    <button
                      onClick={() => handleRemove(product._id)}
                      className="text-sm text-gray-700 hover:text-gray-900"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">Your wishlist is empty</h3>
          <p className="text-gray-700 mb-6">Save your favorite items for later</p>
          <Link to="/search">
            <Button variant="primary">Start Shopping</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Wishlist;