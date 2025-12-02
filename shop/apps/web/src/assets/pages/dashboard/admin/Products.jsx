// FILE: apps/web/src/pages/dashboard/admin/Products.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatCurrency } from '@/utils/format';
import { Plus, Edit, Trash2, Eye, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Products = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/products?${params}`);
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/admin/products/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product approved successfully');
    },
    onError: (error) => {
      toast.error('Failed to approve product: ' + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/admin/products/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product rejected');
    },
    onError: (error) => {
      toast.error('Failed to reject product: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete product: ' + error.message);
    },
  });

  // Bulk delete mutation - deletes multiple products with single toast
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => api.delete(`/admin/products/${id}`)));
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setSelectedProducts([]);
      toast.success(`${count} product(s) deleted successfully`);
    },
    onError: (error) => {
      toast.error('Error deleting products: ' + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const products = data?.data || [];
  const totalProducts = data?.meta?.total || 0;
  const totalPages = Math.ceil(totalProducts / 20);

  // Select All functionality
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedProducts(products.map(p => p._id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId, checked) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const isAllSelected = products.length > 0 && selectedProducts.length === products.length;
  const isSomeSelected = selectedProducts.length > 0 && selectedProducts.length < products.length;

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleView = (product) => {
    setViewingProduct(product);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-gray-600 mt-1">
            Total Products: <span className="font-semibold text-blue-600">{totalProducts}</span>
            {selectedProducts.length > 0 && (
              <span className="ml-3 text-green-600">
                ({selectedProducts.length} selected)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {selectedProducts.length > 0 && (
            <Button
              variant="outline"
              disabled={bulkDeleteMutation.isPending}
              onClick={() => {
                if (confirm(`Delete ${selectedProducts.length} selected products?`)) {
                  bulkDeleteMutation.mutate(selectedProducts);
                }
              }}
              className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          )}
          <Button
            onClick={() => {
              setEditingProduct(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Products' },
              { value: 'published', label: 'Published' },
              { value: 'unpublished', label: 'Unpublished' },
            ]}
            placeholder="All Products"
            className="w-full"
          />
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setPage(1);
            }}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Select all products"
                  />
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Product</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Vendor</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Price</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Stock</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Created</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className={`border-b last:border-b-0 hover:bg-gray-50 ${selectedProducts.includes(product._id) ? 'bg-blue-50' : ''}`}>
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product._id)}
                      onChange={(e) => handleSelectProduct(product._id, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">{product.title}</p>
                        <p className="text-xs text-gray-700">{product.brand}</p>
                        <p className="text-xs text-gray-500">SKU: {product.sku || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div>
                      <p className="font-medium">{product.vendorId?.storeName || 'N/A'}</p>
                      <p className="text-xs text-gray-700">{product.vendorId?.email || ''}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <p className="font-semibold">{formatCurrency(product.price)}</p>
                      {product.comparePrice && (
                        <p className="text-xs text-gray-500 line-through">
                          {formatCurrency(product.comparePrice)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`font-medium ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {product.stock}
                    </span>
                    <p className="text-xs text-gray-500">units</p>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        product.published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {product.published ? 'Published' : 'Unpublished'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(product)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-gray-700 hover:text-gray-700 p-1"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!product.published && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(product._id)}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Approve Product"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(product._id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Reject Product"
                          >
                            ✗
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct || viewingProduct}
          isViewing={!!viewingProduct}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
            setViewingProduct(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            setShowModal(false);
            setEditingProduct(null);
            setViewingProduct(null);
          }}
        />
      )}
    </div>
  );
};

// Product Modal Component
const ProductModal = ({ product, isViewing, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: product?.title || '',
    description: product?.description || '',
    videoUrl: product?.videoUrl || '',
    price: product?.price || '',
    comparePrice: product?.comparePrice || '',
    stock: product?.stock || '',
    sku: product?.sku || '',
    brand: product?.brand || '',
    tags: product?.tags ? product.tags.join(', ') : '',
    published: product?.published || false,
    featured: product?.featured || false,
    images: product?.images || [],
    vendorCommissionPercentage: product?.vendorCommissionPercentage || '',
    affiliateCommissionPercentage: product?.affiliateCommissionPercentage || '',
    taxable: product?.taxable !== undefined ? product.taxable : true,
    taxRate: product?.taxRate || 0,
    hasWarranty: product?.hasWarranty || false,
    warranty: {
      duration: product?.warranty?.duration || '',
      durationType: product?.warranty?.durationType || 'months',
      description: product?.warranty?.description || '',
      terms: product?.warranty?.terms || '',
      provider: product?.warranty?.provider || '',
      activationRequired: product?.warranty?.activationRequired || false,
    },
    categoryIds: product?.categoryIds || [],
  });

  const [schemaData, setSchemaData] = useState({
    schemaType: product?.structuredData?.schemaType || 'Product',
    properties: product?.structuredData?.properties || {},
    customSnippets: product?.structuredData?.customSnippets || [],
  });

  const [showSchemaSection, setShowSchemaSection] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

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
        await api.put(`/admin/products/${product._id}`, data);
        return 'updated';
      } else {
        await api.post('/admin/products', data);
        return 'created';
      }
    },
    onSuccess: (action) => {
      toast.success(`Product ${action} successfully`);
      onSave();
    },
    onError: (error) => {
      toast.error('Failed to save product: ' + error.message);
    },
  });

  const handleImageUpload = async (files) => {
    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/upload/single', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data.url;
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
    } catch (error) {
      toast.error('Error uploading images: ' + error.message);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
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
            {isViewing ? 'Product Details' : product?._id ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isViewing}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                disabled={isViewing}
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
                disabled={isViewing}
                className="input w-full"
                placeholder="e.g., electronics, smartphone, samsung, 5g"
              />
              <p className="text-xs text-gray-500 mt-1">
                Add tags to help customers find this product in search. Separate multiple tags with commas.
              </p>
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
                disabled={isViewing}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                disabled={isViewing}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compare Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.comparePrice}
                onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                disabled={isViewing}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                disabled={isViewing}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                disabled={isViewing}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor Commission %
                <span className="text-xs text-gray-500 ml-1">(leave empty for default)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.vendorCommissionPercentage}
                onChange={(e) => setFormData({ ...formData, vendorCommissionPercentage: e.target.value })}
                disabled={isViewing}
                className="input w-full"
                placeholder="e.g., 15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Affiliate Commission %
                <span className="text-xs text-gray-500 ml-1">(leave empty for default)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.affiliateCommissionPercentage}
                onChange={(e) => setFormData({ ...formData, affiliateCommissionPercentage: e.target.value })}
                disabled={isViewing}
                className="input w-full"
                placeholder="e.g., 5"
              />
            </div>
          </div>

          {/* GST/Tax Settings */}
          <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">GST/Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.taxable}
                    onChange={(e) => setFormData({ ...formData, taxable: e.target.checked })}
                    disabled={isViewing}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500"
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
                    disabled={isViewing}
                    className="input w-full"
                    placeholder="e.g., 18 for 18% GST"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Common GST rates: 5%, 12%, 18%, 28%
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isViewing}
              className="input w-full h-24"
              rows={4}
            />
          </div>

          {/* YouTube Video URL */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              YouTube Video URL (Optional)
            </label>
            <input
              type="text"
              value={formData.videoUrl || ''}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              disabled={isViewing}
              className="input w-full"
              placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Add a YouTube video URL to showcase your product (will be displayed at 300px height)
            </p>
          </div>

          {/* Image Upload */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Images
              {formData.images.length > 0 && (
                <span className="text-gray-500 text-xs ml-2">({formData.images.length} {formData.images.length === 1 ? 'image' : 'images'})</span>
              )}
            </label>
            {!isViewing && (
              <div className="mb-4">
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files)}
                      disabled={uploadingImages}
                      className="hidden"
                      id="imageUpload"
                    />
                    <div className="text-gray-700">
                      {uploadingImages ? (
                        <p className="text-blue-600 font-medium">📤 Uploading images...</p>
                      ) : (
                        <>
                          <p className="font-medium">Click to upload images</p>
                          <p className="text-xs mt-1">or drag and drop</p>
                          <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            )}
            
            {/* Image Gallery */}
            {formData.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                    {!isViewing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500 text-sm">📷 No images uploaded yet</p>
                {!isViewing && (
                  <p className="text-gray-400 text-xs mt-1">Upload images using the button above</p>
                )}
              </div>
            )}
          </div>

          {/* Warranty Section */}
          <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Warranty Information</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.hasWarranty}
                  onChange={(e) => setFormData({ ...formData, hasWarranty: e.target.checked })}
                  disabled={isViewing}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Has Warranty</span>
              </label>
            </div>

            {formData.hasWarranty && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warranty Duration
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.warranty.duration}
                    onChange={(e) => setFormData({
                      ...formData,
                      warranty: { ...formData.warranty, duration: e.target.value }
                    })}
                    disabled={isViewing}
                    className="input w-full"
                    placeholder="e.g., 12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration Type
                  </label>
                  <select
                    value={formData.warranty.durationType}
                    onChange={(e) => setFormData({
                      ...formData,
                      warranty: { ...formData.warranty, durationType: e.target.value }
                    })}
                    disabled={isViewing}
                    className="input w-full"
                  >
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warranty Provider
                  </label>
                  <input
                    type="text"
                    value={formData.warranty.provider}
                    onChange={(e) => setFormData({
                      ...formData,
                      warranty: { ...formData.warranty, provider: e.target.value }
                    })}
                    disabled={isViewing}
                    className="input w-full"
                    placeholder="e.g., Manufacturer, Vendor"
                  />
                </div>

                <div>
                  <label className="flex items-center pt-7">
                    <input
                      type="checkbox"
                      checked={formData.warranty.activationRequired}
                      onChange={(e) => setFormData({
                        ...formData,
                        warranty: { ...formData.warranty, activationRequired: e.target.checked }
                      })}
                      disabled={isViewing}
                      className="mr-2"
                    />
                    <span className="text-sm">Requires Activation</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warranty Description
                  </label>
                  <textarea
                    value={formData.warranty.description}
                    onChange={(e) => setFormData({
                      ...formData,
                      warranty: { ...formData.warranty, description: e.target.value }
                    })}
                    disabled={isViewing}
                    className="input w-full h-20"
                    rows={3}
                    placeholder="Describe what the warranty covers..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warranty Terms & Conditions
                  </label>
                  <textarea
                    value={formData.warranty.terms}
                    onChange={(e) => setFormData({
                      ...formData,
                      warranty: { ...formData.warranty, terms: e.target.value }
                    })}
                    disabled={isViewing}
                    className="input w-full h-20"
                    rows={3}
                    placeholder="Enter warranty terms and conditions..."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                disabled={isViewing}
                className="mr-2"
              />
              Published
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                disabled={isViewing}
                className="mr-2"
              />
              Featured
            </label>
          </div>

          {/* Schema & Snippets Section */}
          {!isViewing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Schema Type</label>
                    <select value={schemaData.schemaType} onChange={(e) => setSchemaData({ ...schemaData, schemaType: e.target.value, properties: {} })} className="input w-full">
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
                        <input type="text" placeholder="e.g., Nike, Apple" value={schemaData.properties?.brand || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, brand: e.target.value } })} className="input w-full text-sm" />
                      </div>

                      {schemaData.schemaType === 'Product' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
                            <input type="text" placeholder="e.g., iPhone 15 Pro" value={schemaData.properties?.model || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, model: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                            <input type="text" placeholder="e.g., Black, Red" value={schemaData.properties?.color || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, color: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                            <input type="text" placeholder="e.g., Cotton, Stainless Steel" value={schemaData.properties?.material || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, material: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">GTIN/UPC/EAN</label>
                            <input type="text" placeholder="Global Trade Item Number" value={schemaData.properties?.gtin || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, gtin: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">MPN</label>
                            <input type="text" placeholder="Manufacturer Part Number" value={schemaData.properties?.mpn || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, mpn: e.target.value } })} className="input w-full text-sm" />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'Book' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Author</label>
                            <input type="text" placeholder="e.g., J.K. Rowling" value={schemaData.properties?.author || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, author: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">ISBN</label>
                            <input type="text" placeholder="e.g., 978-3-16-148410-0" value={schemaData.properties?.isbn || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, isbn: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Publisher</label>
                            <input type="text" placeholder="e.g., Penguin Books" value={schemaData.properties?.publisher || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, publisher: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Number of Pages</label>
                            <input type="number" placeholder="e.g., 320" value={schemaData.properties?.numberOfPages || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, numberOfPages: e.target.value } })} className="input w-full text-sm" />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'Movie' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Director</label>
                            <input type="text" placeholder="e.g., Christopher Nolan" value={schemaData.properties?.director || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, director: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Actors</label>
                            <input type="text" placeholder="e.g., Tom Hardy, Anne Hathaway" value={schemaData.properties?.actors || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, actors: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
                            <input type="number" placeholder="e.g., 148" value={schemaData.properties?.duration || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, duration: e.target.value } })} className="input w-full text-sm" />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'MusicAlbum' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Artist</label>
                            <input type="text" placeholder="e.g., Taylor Swift" value={schemaData.properties?.artist || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, artist: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Genre</label>
                            <input type="text" placeholder="e.g., Pop, Rock" value={schemaData.properties?.genre || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, genre: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Number of Tracks</label>
                            <input type="number" placeholder="e.g., 12" value={schemaData.properties?.numTracks || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, numTracks: e.target.value } })} className="input w-full text-sm" />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'SoftwareApplication' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Operating System</label>
                            <input type="text" placeholder="e.g., Windows, macOS, iOS" value={schemaData.properties?.operatingSystem || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, operatingSystem: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Application Category</label>
                            <input type="text" placeholder="e.g., Game, Business, Education" value={schemaData.properties?.applicationCategory || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, applicationCategory: e.target.value } })} className="input w-full text-sm" />
                          </div>
                        </>
                      )}

                      {schemaData.schemaType === 'VideoGame' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Game Platform</label>
                            <input type="text" placeholder="e.g., PlayStation 5, Xbox Series X" value={schemaData.properties?.gamePlatform || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, gamePlatform: e.target.value } })} className="input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Genre</label>
                            <input type="text" placeholder="e.g., Action, Adventure, RPG" value={schemaData.properties?.genre || ''} onChange={(e) => setSchemaData({ ...schemaData, properties: { ...schemaData.properties, genre: e.target.value } })} className="input w-full text-sm" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Custom Snippets</label>
                      <button type="button" onClick={addCustomSnippet} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add Snippet</button>
                    </div>

                    {schemaData.customSnippets.map((snippet, index) => (
                      <div key={index} className="bg-white p-3 rounded border border-gray-200 mb-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <input type="text" placeholder="Snippet name (e.g., Brand, Author, ISBN)" value={snippet.name} onChange={(e) => updateCustomSnippet(index, 'name', e.target.value)} className="input w-full text-sm" />
                            <input type="text" placeholder="Snippet content/value" value={snippet.content} onChange={(e) => updateCustomSnippet(index, 'content', e.target.value)} className="input w-full text-sm" />
                          </div>
                          <button type="button" onClick={() => removeCustomSnippet(index)} className="text-red-500 hover:text-red-700 mt-1"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}

                    {schemaData.customSnippets.length === 0 && (<p className="text-xs text-gray-500 italic">No custom snippets added. Click "+ Add Snippet" to add structured data properties.</p>)}
                  </div>

                  <div className="bg-blue-100 p-3 rounded text-xs text-gray-700"><strong>💡 Tip:</strong> Schema markup helps search engines understand your product better. Common properties: Brand, Model, Color, Size, Material, Author, ISBN, etc.</div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-4 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              {isViewing ? 'Close' : 'Cancel'}
            </Button>
            {!isViewing && (
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : product?._id ? 'Update' : 'Create'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Products;