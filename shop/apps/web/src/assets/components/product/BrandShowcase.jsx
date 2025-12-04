// FILE: apps/web/src/components/product/BrandShowcase.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import { formatCurrency } from '@/utils/format';
import { normalizeImageUrl } from '@/utils/placeholders';
import Spinner from '@/components/common/Spinner';
import useTranslation from '@/hooks/useTranslation';

// Brand card component - displays a brand with 2 product images
const BrandCard = React.memo(({ brand, products, priceLabel }) => {
  // Get up to 2 products for display
  const displayProducts = products.slice(0, 2);

  return (
    <Link
      to={`/search?brand=${encodeURIComponent(brand)}`}
      className="block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* Product images grid - 2 images side by side */}
      <div className="grid grid-cols-2 gap-1 p-2 bg-gray-50">
        {displayProducts.map((product, idx) => (
          <div key={product._id || idx} className="aspect-square relative overflow-hidden rounded-lg bg-white">
            {product.images && product.images.length > 0 ? (
              <img
                src={normalizeImageUrl(product.images[0])}
                alt={product.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                No image
              </div>
            )}
            {/* Discount badge */}
            {product.compareAt && product.compareAt > product.price && (
              <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                -{Math.round(((product.compareAt - product.price) / product.compareAt) * 100)}%
              </div>
            )}
          </div>
        ))}
        {/* Fill empty slots if less than 2 products */}
        {displayProducts.length < 2 && (
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-gray-300 text-xs">More coming</span>
          </div>
        )}
      </div>

      {/* Brand name and price label */}
      <div className="p-3 bg-white">
        <p className="text-sm font-medium text-gray-900 truncate">{priceLabel}</p>
        <p className="text-xs text-gray-500 truncate">{brand}</p>
      </div>
    </Link>
  );
});

BrandCard.displayName = 'BrandCard';

// Main BrandShowcase component
const BrandShowcase = React.memo(({
  title,
  subtitle,
  backgroundColor = 'from-orange-500 to-red-500',
  limit = 4
}) => {
  const { t } = useTranslation();

  // Fetch products grouped by brand
  const { data: brandProducts, isLoading } = useQuery({
    queryKey: ['brand-showcase', limit],
    queryFn: async () => {
      // Fetch products and group by brand
      const { data } = await api.get(`/catalog/products?limit=50&sort=-soldCount`);
      const products = data.data || [];

      // Group products by brand
      const brandMap = {};
      products.forEach(product => {
        const brand = product.brand || 'Other';
        if (!brandMap[brand]) {
          brandMap[brand] = [];
        }
        if (brandMap[brand].length < 2) {
          brandMap[brand].push(product);
        }
      });

      // Convert to array and limit
      const brands = Object.entries(brandMap)
        .filter(([brand, prods]) => brand !== 'Other' && prods.length >= 1)
        .slice(0, limit)
        .map(([brand, prods]) => {
          // Calculate min price for this brand's products
          const minPrice = Math.min(...prods.map(p => p.price));
          return {
            brand,
            products: prods,
            minPrice
          };
        });

      return brands;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!brandProducts || brandProducts.length === 0) {
    return null;
  }

  // Generate price labels for each brand
  const getPriceLabel = (minPrice, brand) => {
    if (minPrice < 100) return `Starting ${formatCurrency(minPrice)} | ${brand}`;
    if (minPrice < 500) return `Under ${formatCurrency(499)} | ${brand}`;
    if (minPrice < 1000) return `Under ${formatCurrency(999)} | ${brand}`;
    return `Starting ${formatCurrency(minPrice)} | ${brand}`;
  };

  return (
    <section className="mb-8">
      {/* Section header with gradient background */}
      <div className={`bg-gradient-to-r ${backgroundColor} rounded-t-xl p-4`}>
        <h2 className="text-lg md:text-xl font-bold text-white">
          {title || t('home.topBrands')}
        </h2>
        {subtitle && (
          <p className="text-sm text-white/90 mt-1">{subtitle}</p>
        )}
      </div>

      {/* Products grid - 2x2 on mobile, 4 columns on desktop */}
      <div className={`bg-gradient-to-r ${backgroundColor} rounded-b-xl p-3`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {brandProducts.map((item, index) => (
            <div
              key={item.brand}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <BrandCard
                brand={item.brand}
                products={item.products}
                priceLabel={getPriceLabel(item.minPrice, item.brand)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

BrandShowcase.displayName = 'BrandShowcase';

export default BrandShowcase;
