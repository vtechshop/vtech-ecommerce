// FILE: apps/web/src/pages/dashboard/affiliate/AllProductLinks.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { Copy, Check, Download, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/common/ToastContainer';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

const AllProductLinks = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [copiedLink, setCopiedLink] = useState(null);
  const [showLinks, setShowLinks] = useState(true);
  const toast = useToast();

  // Fetch affiliate info
  const { data: affiliateData, error: affiliateError } = useQuery({
    queryKey: ['affiliate-links'],
    queryFn: async () => {
      const response = await api.get('/affiliates/links');
      return response.data.data;
    },
    retry: false,
  });

  // Fetch all products
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['all-products-for-affiliate'],
    queryFn: async () => {
      const response = await api.get('/catalog/products?limit=1000');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });

  const affiliateCode = affiliateData?.code;
  const products = productsData || [];

  // Get unique vendors for filter
  const vendors = useMemo(() => {
    const uniqueVendors = [];
    const vendorIds = new Set();

    products.forEach(product => {
      if (product.vendorId && !vendorIds.has(product.vendorId._id)) {
        vendorIds.add(product.vendorId._id);
        uniqueVendors.push(product.vendorId);
      }
    });

    return uniqueVendors.sort((a, b) =>
      (a.storeName || '').localeCompare(b.storeName || '')
    );
  }, [products]);

  // Filter products based on search and vendor
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by vendor
    if (vendorFilter) {
      filtered = filtered.filter(product => product.vendorId?._id === vendorFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.title?.toLowerCase().includes(query) ||
          product.slug?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.vendorId?.storeName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, searchQuery, vendorFilter]);

  // Generate affiliate link for a product
  const generateAffiliateLink = (productSlug) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/product/${productSlug}?affId=${affiliateCode}`;
  };

  // Copy single link
  const handleCopyLink = (link, productId) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(productId);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Copy all links
  const handleCopyAllLinks = () => {
    const allLinks = filteredProducts
      .map((product) => {
        const link = generateAffiliateLink(product.slug);
        return `${product.title}: ${link}`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(allLinks);
    toast.success(`Copied ${filteredProducts.length} affiliate links!`);
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const csvContent = [
      ['Product Name', 'Vendor', 'SKU', 'Price', 'Commission %', 'Your Earning', 'Slug', 'Affiliate Link'].join(','),
      ...filteredProducts.map((product) => {
        const link = generateAffiliateLink(product.slug);
        const commissionRate = product.affiliateCommissionPercentage || affiliateData?.commissionPercentage || 5;
        const earning = (product.price * commissionRate / 100).toFixed(2);
        return [
          `"${product.title}"`,
          `"${product.vendorId?.storeName || 'Unknown'}"`,
          product.sku || '',
          product.price || 0,
          commissionRate,
          earning,
          product.slug,
          `"${link}"`,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `affiliate-links-${affiliateCode}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully!');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading products...</p>
        </div>
      </div>
    );
  }

  // Show error only for non-404 errors
  if (affiliateError && affiliateError?.response?.status !== 404) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to load affiliate data</h2>
          <p className="text-gray-600 mb-4">Something went wrong. Please try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // For 404 errors on affiliate data, show setup message
  if (affiliateError && affiliateError?.response?.status === 404) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Setting up your affiliate profile...</h2>
          <p className="text-gray-600 mb-4">Your profile is being created. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md">
            <h3 className="font-bold mb-2">Error Loading Products</h3>
            <p className="text-sm">{error.message || 'Failed to fetch products'}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">All Product Links</h1>
        <p className="text-gray-700">
          Generate and manage affiliate links for all products
        </p>
      </div>

      {/* Affiliate Code Display */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Your Affiliate Code:</p>
            <code className="text-lg font-bold text-blue-600">{affiliateCode}</code>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{filteredProducts.length}</p>
            <p className="text-sm text-gray-700">Products Available</p>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-col gap-3">
          {/* Search and Vendor Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search */}
            <div className="flex-1 w-full">
              <Input
                type="text"
                placeholder="Search products by name, vendor, or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Vendor Filter */}
            <div className="w-full sm:w-64">
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Vendors ({products.length})</option>
                {vendors.map((vendor) => (
                  <option key={vendor._id} value={vendor._id}>
                    {vendor.storeName || 'Unknown Vendor'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex gap-2 w-full sm:w-auto sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLinks(!showLinks)}
              className="flex-1 sm:flex-none"
            >
              {showLinks ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hide All Links
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Show All Links
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAllLinks}
              className="flex-1 sm:flex-none"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy All Links ({filteredProducts.length})
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadCSV}
              className="flex-1 sm:flex-none"
            >
              <Download className="w-4 h-4 mr-1" />
              Download CSV ({filteredProducts.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product & Vendor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                {showLinks && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Affiliate Link
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={showLinks ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || vendorFilter ? 'No products found matching your filters' : 'No products available'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const affiliateLink = generateAffiliateLink(product.slug);
                  const isCopied = copiedLink === product._id;
                  const commissionRate = product.affiliateCommissionPercentage || affiliateData?.commissionPercentage || 5;
                  const earning = (product.price * commissionRate / 100);

                  return (
                    <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                      {/* Product Image */}
                      <td className="px-4 py-3">
                        <img
                          src={product.images?.[0] || PLACEHOLDER_IMAGE_SM}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded border border-gray-200"
                          onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                        />
                      </td>

                      {/* Product Name & Vendor */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{product.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            by <span className="font-medium text-blue-600">{product.vendorId?.storeName || 'Unknown Vendor'}</span>
                          </p>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-gray-900">
                          ₹{product.price?.toFixed(2)}
                        </p>
                      </td>

                      {/* Commission */}
                      <td className="px-4 py-3">
                        <div className="text-center">
                          <p className="text-sm font-bold text-green-600">
                            {commissionRate}%
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            ≈ ₹{earning.toFixed(2)}
                          </p>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {product.slug}
                        </code>
                      </td>

                      {/* Affiliate Link */}
                      {showLinks && (
                        <td className="px-4 py-3 max-w-md">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                              {affiliateLink}
                            </code>
                          </div>
                        </td>
                      )}

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <Button
                          variant={isCopied ? 'success' : 'outline'}
                          size="sm"
                          onClick={() => handleCopyLink(affiliateLink, product._id)}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 className="font-semibold text-blue-900 mb-2">💡 How to use these links:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li><strong>Filter by vendor</strong> to see products from specific sellers</li>
          <li><strong>Search</strong> by product name, vendor name, or slug</li>
          <li><strong>Commission rates</strong> are shown for each product (typically {affiliateData?.commissionPercentage || 5}%)</li>
          <li><strong>Expected earnings</strong> are calculated based on product price</li>
          <li>Click <strong>"Copy"</strong> to copy a single product's affiliate link</li>
          <li>Click <strong>"Download CSV"</strong> to get all product links with vendor info and earnings</li>
          <li>Share these links on your website, blog, social media, or emails</li>
          <li>You earn a commission when someone purchases through your link</li>
          <li>Cookie tracking ensures you get credit for up to 30 days after the click</li>
        </ul>
      </div>
    </div>
  );
};

export default AllProductLinks;
