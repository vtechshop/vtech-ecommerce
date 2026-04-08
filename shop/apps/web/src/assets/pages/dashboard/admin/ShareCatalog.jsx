// FILE: apps/web/src/pages/dashboard/admin/ShareCatalog.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import Pagination from '@/components/common/Pagination';
import { Search, Copy, MessageCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const BASE_URL = 'https://www.vtechkitchen.com';

const ShareCatalog = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['share-catalog-products', page, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      params.append('status', 'active');
      if (searchTerm) params.append('search', searchTerm);
      const response = await api.get(`/admin/products?${params}`);
      return response.data;
    },
  });

  const products = data?.products || [];
  const totalPages = data?.totalPages || 1;

  const getProductUrl = (slug) => `${BASE_URL}/product/${slug}`;

  const handleCopy = (slug, name) => {
    navigator.clipboard.writeText(getProductUrl(slug));
    toast.success(`Copied link for "${name}"`);
  };

  const handleWhatsApp = (slug, name, price) => {
    const url = getProductUrl(slug);
    const message = `Hi! Check out this product on VTech Kitchen:\n\n*${name}*\nPrice: ₹${price}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setPage(1);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Share Product Catalog</h1>
        <p className="text-gray-500 mt-1 text-sm">Copy product links or share directly to WhatsApp with image preview</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
        >
          Search
        </button>
        {searchTerm && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Clear
          </button>
        )}
      </form>

      {/* Product Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No products found</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => {
              const url = getProductUrl(product.slug);
              const price = product.salePrice || product.price;
              return (
                <div
                  key={product._id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Product Image */}
                  <div className="relative bg-gray-50 aspect-square overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        No Image
                      </div>
                    )}
                    {/* View on site link */}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full p-1.5 hover:bg-opacity-100 shadow"
                      title="View on website"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                    </a>
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 min-h-[2.5rem]">
                      {product.title}
                    </p>
                    <p className="text-green-700 font-bold text-sm mb-3">
                      ₹{Number(price).toLocaleString('en-IN')}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(product.slug, product.title)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                        title="Copy product link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </button>
                      <button
                        onClick={() => handleWhatsApp(product.slug, product.title, Number(price).toLocaleString('en-IN'))}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShareCatalog;
