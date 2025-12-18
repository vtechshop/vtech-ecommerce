// FILE: apps/web/src/pages/dashboard/vendor/Products.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/format';
import { X, AlertCircle, ExternalLink } from 'lucide-react';

const Products = () => {
  const queryClient = useQueryClient();

  // Restore page from sessionStorage on component mount
  const [page, setPage] = useState(() => {
    const savedPage = sessionStorage.getItem('vendor-products-page');
    return savedPage ? parseInt(savedPage) : 1;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success', 'error', 'warning'

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor-products', page],
    queryFn: async () => {
      const response = await api.get(`/vendors/products?page=${page}&limit=10`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    keepPreviousData: true, // Keep previous page data while fetching new page
  });

  // Save page to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('vendor-products-page', page.toString());
  }, [page]);

  // Restore scroll position on mount
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('vendor-products-scroll');
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll));
    }
  }, []);

  // Save scroll position when user scrolls
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('vendor-products-scroll', window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/vendors/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      setToastMessage('Product deleted successfully');
      setToastType('success');
      setShowToast(true);
    },
  });

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddProductClick = async () => {
    try {
      // Try to access vendor stats endpoint - if it fails, vendor is not approved
      await api.get('/vendors/dashboard/stats');
      // If successful, vendor is approved, open modal
      setIsModalOpen(true);
    } catch (error) {
      const errorCode = error.response?.data?.error?.code;
      const kycStatus = error.response?.data?.error?.kycStatus;

      if (errorCode === 'KYC_REQUIRED') {
        setToastMessage('Please complete your vendor profile and KYC verification first.');
        setToastType('warning');
      } else if (errorCode === 'KYC_NOT_APPROVED') {
        if (kycStatus === 'pending') {
          setToastMessage('Your KYC verification is pending approval. Please wait for admin to approve your account before adding products.');
        } else if (kycStatus === 'rejected') {
          setToastMessage('Your KYC verification was rejected. Please update your KYC documents and resubmit.');
        } else {
          setToastMessage('Please complete KYC verification before adding products.');
        }
        setToastType('warning');
      } else if (error.response?.status === 404) {
        setToastMessage('Your vendor application is pending approval. Please wait for admin to approve your account before adding products.');
        setToastType('warning');
      } else {
        setToastMessage('Unable to verify vendor status. Please try again or contact support.');
        setToastType('error');
      }
      setShowToast(true);
    }
  };

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const products = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 10);

  return (
    <div>
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`${
            toastType === 'success' ? 'bg-green-600' :
            toastType === 'error' ? 'bg-red-600' :
            'bg-yellow-600'
          } text-white rounded-lg shadow-2xl p-4 flex items-center gap-3 min-w-[320px] max-w-md`}>
            <div className="flex-shrink-0">
              {toastType === 'success' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{toastMessage}</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Products</h1>
        <Button onClick={handleAddProductClick} variant="primary">
          Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">No products yet</h3>
          <p className="text-gray-700 mb-6">Start by adding your first product</p>
          <Button onClick={handleAddProductClick} variant="primary">
            Add Product
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">SKU</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Stock</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} className="border-b last:border-b-0">
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.title} className="w-12 h-12 object-cover rounded" />
                        )}
                        <div>
                          <p className="font-medium">{product.title}</p>
                          <p className="text-sm text-gray-700">{product.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono">{product.sku}</td>
                    <td className="py-3 px-4 font-semibold">{formatCurrency(product.price)}</td>
                    <td className="py-3 px-3 sm:px-4">
                      <span className={product.stock < 10 ? 'text-red-600' : 'text-green-600'}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        product.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-900'
                      }`}>
                        {product.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/product/${product.slug}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                          title="View on storefront"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </Link>
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setIsModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          showToast={(message, type = 'success') => {
            setToastMessage(message);
            setToastType(type);
            setShowToast(true);
          }}
        />
      )}
    </div>
  );
};

// Product Form Modal Component
const ProductFormModal = ({ product, onClose, onSave, showToast }) => {
  const [formData, setFormData] = useState({
    title: product?.title || '',
    description: product?.description || '',
    videoUrl: product?.videoUrl || '',
    price: product?.price || '',
    compareAt: product?.compareAt || '',
    stock: product?.stock || '',
    sku: product?.sku || '',
    brand: product?.brand || '',
    tags: product?.tags ? product.tags.join(', ') : '',
    published: product?.published || false,
    featured: product?.featured || false,
    taxable: product?.taxable !== undefined ? product.taxable : true,
    taxRate: product?.taxRate || '',
    categoryIds: product?.categoryIds || [],
    hasWarranty: product?.hasWarranty || false,
    warrantyDuration: product?.warranty?.duration || '',
    warrantyDurationType: product?.warranty?.durationType || 'months',
    warrantyProvider: product?.warranty?.provider || '',
    warrantyDescription: product?.warranty?.description || '',
    warrantyTerms: product?.warranty?.terms || '',
    warrantyActivationRequired: product?.warranty?.activationRequired || false,
  });

  const [schemaData, setSchemaData] = useState({
    schemaType: product?.structuredData?.schemaType || 'Product',
    properties: product?.structuredData?.properties || {},
    customSnippets: product?.structuredData?.customSnippets || [],
  });

  const [showSchemaSection, setShowSchemaSection] = useState(false);

  const [images, setImages] = useState(product?.images || []);
  const [uploading, setUploading] = useState(false);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/catalog/categories');
      return response.data.data;
    },
  });

  const categories = categoriesData || [];

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (product?._id) {
        return await api.put(`/vendors/products/${product._id}`, data);
      } else {
        return await api.post('/vendors/products', data);
      }
    },
    onSuccess: (response) => {
      const savedProduct = response?.data?.data;
      if (savedProduct) {
        showToast(`Product "${savedProduct.title}" saved successfully!`, 'success');
      } else {
        showToast('Product saved successfully!', 'success');
      }
      onSave();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to save product';
      showToast(`Error: ${errorMessage}`, 'error');
    },
  });

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    setUploading(true);
    try {
      const response = await api.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedUrls = response?.data?.data?.map(file => file.url) || [];
      setImages([...images, ...uploadedUrls]);
    } catch (error) {
      alert('Image upload failed: ' + (error.response?.data?.error?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Build warranty object
    const warranty = formData.hasWarranty ? {
      duration: formData.warrantyDuration ? parseInt(formData.warrantyDuration) : undefined,
      durationType: formData.warrantyDurationType,
      provider: formData.warrantyProvider,
      description: formData.warrantyDescription,
      terms: formData.warrantyTerms,
      activationRequired: formData.warrantyActivationRequired,
    } : undefined;

    const dataToSubmit = {
      title: formData.title,
      description: formData.description,
      videoUrl: formData.videoUrl,
      price: parseFloat(formData.price),
      compareAt: formData.compareAt ? parseFloat(formData.compareAt) : undefined,
      stock: parseInt(formData.stock),
      sku: formData.sku,
      brand: formData.brand,
      images,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      published: formData.published,
      featured: formData.featured,
      taxable: formData.taxable,
      taxRate: formData.taxRate ? parseFloat(formData.taxRate) : 0,
      categoryIds: formData.categoryIds,
      hasWarranty: formData.hasWarranty,
      warranty: warranty,
      structuredData: schemaData, // Fixed: changed from 'schema' to 'structuredData'
    };

    saveMutation.mutate(dataToSubmit);
  };

  const addCustomSnippet = () => {
    setSchemaData({
      ...schemaData,
      customSnippets: [...schemaData.customSnippets, { name: '', content: '' }],
    });
  };

  const updateCustomSnippet = (index, field, value) => {
    const updated = [...schemaData.customSnippets];
    updated[index][field] = value;
    setSchemaData({ ...schemaData, customSnippets: updated });
  };

  const removeCustomSnippet = (index) => {
    setSchemaData({
      ...schemaData,
      customSnippets: schemaData.customSnippets.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input w-full"
                required
              />
            </div>

            {/* Product Images */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Images
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="input w-full"
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-gray-500 mt-1">Uploading images...</p>}
              {images.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img}
                        alt={`Product ${idx + 1}`}
                        className="w-full h-24 object-cover rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categories
              </label>
              <select
                value={formData.categoryIds[0] || ''}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    categoryIds: e.target.value ? [e.target.value] : []
                  });
                }}
                className="input w-full"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="input w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
                <span className="text-xs text-gray-500 ml-1">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="input w-full"
                placeholder="e.g., electronics, smartphone, samsung, 5g"
              />
              <p className="text-xs text-gray-500 mt-1">
                Add tags to help customers find your product in search. Separate multiple tags with commas.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compare At Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.compareAt}
                onChange={(e) => setFormData({ ...formData, compareAt: e.target.value })}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="input w-full"
                required
              />
            </div>

            {/* GST/Tax Settings */}
            <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">GST/Tax Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.taxable}
                      onChange={(e) => setFormData({ ...formData, taxable: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Product is taxable</span>
                  </label>
                </div>

                {formData.taxable && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GST/Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                      className="input w-full"
                      placeholder="e.g., 18 for 18% GST"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Common GST rates: 5%, 12%, 18%, 28%
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-700 mt-2">
                {formData.taxable
                  ? 'GST will be shown on product page as "Inclusive of all taxes"'
                  : 'Product price is considered tax-free'}
              </p>
            </div>

            <div className="md:col-span-1">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Published</span>
              </label>
            </div>

            <div className="md:col-span-1">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Featured</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input w-full h-24"
                rows={4}
                required
              />
            </div>

            {/* YouTube Video URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                YouTube Video URL (Optional)
              </label>
              <input
                type="text"
                value={formData.videoUrl || ''}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="input w-full"
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Add a YouTube video URL to showcase your product (will be displayed at 300px height)
              </p>
            </div>

            {/* Warranty Section */}
            <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Warranty Information (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasWarranty}
                      onChange={(e) => setFormData({ ...formData, hasWarranty: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">This product has a warranty</span>
                  </label>
                </div>

                {formData.hasWarranty && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Warranty Duration
                        </label>
                        <input
                          type="number"
                          value={formData.warrantyDuration}
                          onChange={(e) => setFormData({ ...formData, warrantyDuration: e.target.value })}
                          className="input w-full"
                          placeholder="e.g., 1, 2, 12"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration Type
                        </label>
                        <select
                          value={formData.warrantyDurationType}
                          onChange={(e) => setFormData({ ...formData, warrantyDurationType: e.target.value })}
                          className="input w-full"
                        >
                          <option value="months">Months</option>
                          <option value="years">Years</option>
                          <option value="lifetime">Lifetime</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Warranty Provider
                        </label>
                        <input
                          type="text"
                          value={formData.warrantyProvider}
                          onChange={(e) => setFormData({ ...formData, warrantyProvider: e.target.value })}
                          className="input w-full"
                          placeholder="e.g., Manufacturer, Third-party"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Warranty Description
                        </label>
                        <textarea
                          value={formData.warrantyDescription}
                          onChange={(e) => setFormData({ ...formData, warrantyDescription: e.target.value })}
                          className="input w-full"
                          rows={2}
                          placeholder="Brief description of what's covered"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Warranty Terms & Conditions
                        </label>
                        <textarea
                          value={formData.warrantyTerms}
                          onChange={(e) => setFormData({ ...formData, warrantyTerms: e.target.value })}
                          className="input w-full"
                          rows={2}
                          placeholder="Terms and conditions"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.warrantyActivationRequired}
                            onChange={(e) => setFormData({ ...formData, warrantyActivationRequired: e.target.checked })}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">Requires Activation</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Schema & Snippets Section */}
            <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">SEO Schema & Snippets (Optional)</h3>
                  <p className="text-xs text-gray-700 mt-1">Add structured data for better search engine visibility</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSchemaSection(!showSchemaSection)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showSchemaSection ? 'Hide' : 'Show'}
                </button>
              </div>

              {showSchemaSection && (
                <div className="space-y-4 mt-4">
                  {/* Schema Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schema Type
                    </label>
                    <select
                      value={schemaData.schemaType}
                      onChange={(e) => setSchemaData({ ...schemaData, schemaType: e.target.value, properties: {} })}
                      className="input w-full"
                    >
                      <option value="Product">Product</option>
                      <option value="Book">Book</option>
                      <option value="Movie">Movie</option>
                      <option value="MusicAlbum">Music Album</option>
                      <option value="Recipe">Recipe</option>
                      <option value="SoftwareApplication">Software Application</option>
                      <option value="VideoGame">Video Game</option>
                      <option value="Event">Event</option>
                      <option value="Course">Course</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Select the appropriate schema.org type for rich snippets</p>
                  </div>

                  {/* Schema Properties based on type */}
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Schema Properties</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Common properties for all types */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                        <input
                          type="text"
                          placeholder="e.g., Nike, Apple"
                          value={schemaData.properties?.brand || ''}
                          onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, brand: e.target.value } })}
                          className="input w-full text-sm"
                        />
                      </div>

                      {schemaData.schemaType === 'Product' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
                            <input
                              type="text"
                              placeholder="e.g., iPhone 15 Pro"
                              value={schemaData.properties?.model || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, model: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                            <input
                              type="text"
                              placeholder="e.g., Black, Red"
                              value={schemaData.properties?.color || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, color: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                            <input
                              type="text"
                              placeholder="e.g., Cotton, Stainless Steel"
                              value={schemaData.properties?.material || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, material: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">GTIN/UPC/EAN</label>
                            <input
                              type="text"
                              placeholder="Global Trade Item Number"
                              value={schemaData.properties?.gtin || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, gtin: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">MPN</label>
                            <input
                              type="text"
                              placeholder="Manufacturer Part Number"
                              value={schemaData.properties?.mpn || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, mpn: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'Book' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Author</label>
                            <input
                              type="text"
                              placeholder="e.g., J.K. Rowling"
                              value={schemaData.properties?.author || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, author: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">ISBN</label>
                            <input
                              type="text"
                              placeholder="e.g., 978-3-16-148410-0"
                              value={schemaData.properties?.isbn || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, isbn: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Publisher</label>
                            <input
                              type="text"
                              placeholder="e.g., Penguin Books"
                              value={schemaData.properties?.publisher || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, publisher: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Number of Pages</label>
                            <input
                              type="number"
                              placeholder="e.g., 320"
                              value={schemaData.properties?.numberOfPages || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, numberOfPages: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'Movie' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Director</label>
                            <input
                              type="text"
                              placeholder="e.g., Christopher Nolan"
                              value={schemaData.properties?.director || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, director: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Actors</label>
                            <input
                              type="text"
                              placeholder="e.g., Tom Hardy, Anne Hathaway"
                              value={schemaData.properties?.actors || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, actors: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
                            <input
                              type="number"
                              placeholder="e.g., 148"
                              value={schemaData.properties?.duration || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, duration: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'MusicAlbum' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Artist</label>
                            <input
                              type="text"
                              placeholder="e.g., Taylor Swift"
                              value={schemaData.properties?.artist || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, artist: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Genre</label>
                            <input
                              type="text"
                              placeholder="e.g., Pop, Rock"
                              value={schemaData.properties?.genre || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, genre: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Number of Tracks</label>
                            <input
                              type="number"
                              placeholder="e.g., 12"
                              value={schemaData.properties?.numTracks || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, numTracks: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'SoftwareApplication' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Operating System</label>
                            <input
                              type="text"
                              placeholder="e.g., Windows, macOS, iOS"
                              value={schemaData.properties?.operatingSystem || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, operatingSystem: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Application Category</label>
                            <input
                              type="text"
                              placeholder="e.g., Game, Business, Education"
                              value={schemaData.properties?.applicationCategory || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, applicationCategory: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'VideoGame' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Game Platform</label>
                            <input
                              type="text"
                              placeholder="e.g., PlayStation 5, Xbox Series X"
                              value={schemaData.properties?.gamePlatform || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, gamePlatform: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Genre</label>
                            <input
                              type="text"
                              placeholder="e.g., Action, Adventure, RPG"
                              value={schemaData.properties?.genre || ''}
                              onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, genre: e.target.value } })}
                              className="input w-full text-sm"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Custom Snippets */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Custom Snippets
                      </label>
                      <button
                        type="button"
                        onClick={addCustomSnippet}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Snippet
                      </button>
                    </div>

                    {schemaData.customSnippets.map((snippet, index) => (
                      <div key={index} className="bg-white p-3 rounded border border-gray-200 mb-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              placeholder="Snippet name (e.g., Brand, Author, ISBN)"
                              value={snippet.name}
                              onChange={(e) => updateCustomSnippet(index, 'name', e.target.value)}
                              className="input w-full text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Snippet content/value"
                              value={snippet.content}
                              onChange={(e) => updateCustomSnippet(index, 'content', e.target.value)}
                              className="input w-full text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomSnippet(index)}
                            className="text-red-500 hover:text-red-700 mt-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {schemaData.customSnippets.length === 0 && (
                      <p className="text-xs text-gray-500 italic">
                        No custom snippets added. Click "+ Add Snippet" to add structured data properties.
                      </p>
                    )}
                  </div>

                  <div className="bg-blue-100 p-3 rounded text-xs text-gray-700">
                    <strong>💡 Tip:</strong> Schema markup helps search engines understand your product better.
                    Common properties: Brand, Model, Color, Size, Material, Author, ISBN, etc.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : product ? 'Update' : 'Create'} Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Products;