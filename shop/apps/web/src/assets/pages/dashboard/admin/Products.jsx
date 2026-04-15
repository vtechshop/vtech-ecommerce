// FILE: apps/web/src/pages/dashboard/admin/Products.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatCurrency } from '@/utils/format';
import { Plus, Edit, Trash2, Eye, Search, X, RefreshCw } from 'lucide-react';
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

  const { data, isLoading, refetch } = useQuery({
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
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
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
            <thead className="bg-blue-100 border-b">
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
                <tr key={product._id} className={`border-b last:border-b-0 hover:bg-blue-100 ${selectedProducts.includes(product._id) ? 'bg-blue-50' : ''}`}>
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
                      {product.compareAt && (
                        <p className="text-xs text-gray-500 line-through">
                          {formatCurrency(product.compareAt)}
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
                          : 'bg-blue-100 text-gray-900'
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
          allProducts={data?.data || []}
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
const ProductModal = ({ product, allProducts = [], isViewing, onClose, onSave }) => {
  console.log('ProductModal Debug:', { product: !!product, isViewing, productId: product?._id });

  const [formData, setFormData] = useState({
    vendorId: product?.vendorId?._id || product?.vendorId || '',
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
    vendorCommissionPercentage: product?.vendorCommissionPercentage || '',
    affiliateCommissionPercentage: product?.affiliateCommissionPercentage || '',
    displayOrder: product?.displayOrder || 0,
    weight: product?.weight || '',
    shippingCharge: product?.shippingCharge || '',
    shippingZones: {
      tamilnadu: product?.shippingZones?.find(z => z.zone === 'tamilnadu')?.charge ?? '',
      south: product?.shippingZones?.find(z => z.zone === 'south')?.charge ?? '',
      north: product?.shippingZones?.find(z => z.zone === 'north')?.charge ?? '',
      east:  product?.shippingZones?.find(z => z.zone === 'east')?.charge ?? '',
      west:  product?.shippingZones?.find(z => z.zone === 'west')?.charge ?? '',
    },
    delhiveryEnabled: product?.delhiveryEnabled !== undefined ? product.delhiveryEnabled : true,
    hsnCode: product?.hsnCode || '',
    taxable: product?.taxable !== undefined ? product.taxable : true,
    taxRate: product?.taxRate || 0,
    taxIncluded: product?.taxIncluded || false,
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
    // SEO Fields
    seoTitle: product?.seo?.title || '',
    seoDescription: product?.seo?.description || '',
    seoKeywords: product?.seo?.keywords ? product.seo.keywords.join(', ') : '',
  });

  // Images with alt tags: [{url: string, alt: string}]
  const [images, setImages] = useState(() => {
    const existingImages = product?.images || [];
    const existingAlts = product?.imageAlts || [];
    return existingImages.map((url, idx) => ({
      url: typeof url === 'string' ? url : url.url,
      alt: existingAlts[idx] || (typeof url === 'object' ? url.alt : '') || ''
    }));
  });

  const [faqs, setFaqs] = useState(product?.faqs || []);
  const [specifications, setSpecifications] = useState(product?.specifications || []);

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

  // Fetch vendors for assignment dropdown
  const { data: vendorsData } = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: async () => {
      const response = await api.get('/admin/vendors');
      return response.data.data;
    },
  });

  const categories = categoriesData || [];
  const vendors = vendorsData || [];

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (product?._id) {
        const res = await api.put(`/admin/products/${product._id}`, data);
        return { action: 'updated', data: res.data };
      } else {
        const res = await api.post('/admin/products', data);
        return { action: 'created', data: res.data };
      }
    },
    onSuccess: (result) => {
      toast.success(`Product ${result.action} successfully`);
      onSave();
    },
    onError: (error) => {
      const errData = error.response?.data?.error;
      const fieldErrors = errData?.fields;
      console.error('Product save error (full):', error.response?.data || error);
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        const messages = Object.entries(fieldErrors).map(([f, m]) => `${f}: ${m}`).join('\n');
        toast.error(`Validation errors:\n${messages}`, { duration: 8000 });
      } else {
        const errorMsg = errData?.message || error.response?.data?.message || error.message || 'Unknown error';
        toast.error('Failed to save product: ' + errorMsg, { duration: 6000 });
      }
    },
  });

  const handleImageUpload = async (files) => {
    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const response = await api.post('/upload/single', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return { url: response.data.data.url, alt: '' };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...uploadedImages]);
    } catch (error) {
      toast.error('Error uploading images: ' + error.message);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateImageAlt = (index, alt) => {
    setImages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], alt };
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Client-side validation
    if (!formData.title.trim()) {
      toast.error('Product title is required');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Product description is required');
      return;
    }
    if (!formData.price && formData.price !== 0) {
      toast.error('Product price is required');
      return;
    }
    const price = parseFloat(formData.price);
    const compareAt = formData.compareAt ? parseFloat(formData.compareAt) : null;
    if (compareAt !== null && compareAt < price) {
      toast.error(`Compare-at price (₹${compareAt}) must be ≥ selling price (₹${price})`);
      return;
    }

    const dataToSubmit = {
      ...formData,
      vendorId: formData.vendorId || undefined,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      structuredData: schemaData, // Fixed: changed from 'schema' to 'structuredData'
      // Images with SEO alt tags
      images: images.map(img => img.url),
      imageAlts: images.map(img => img.alt || ''),
      // Convert numeric fields properly - empty strings become null/undefined
      price: formData.price ? parseFloat(formData.price) : 0,
      compareAt: formData.compareAt ? parseFloat(formData.compareAt) : null,
      stock: formData.stock ? parseInt(formData.stock, 10) : 0,
      vendorCommissionPercentage: formData.vendorCommissionPercentage ? parseFloat(formData.vendorCommissionPercentage) : undefined,
      affiliateCommissionPercentage: formData.affiliateCommissionPercentage ? parseFloat(formData.affiliateCommissionPercentage) : undefined,
      displayOrder: parseInt(formData.displayOrder) || 0,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      shippingCharge: formData.shippingCharge ? parseFloat(formData.shippingCharge) : 0,
      // Zone-based shipping: only include zones with a value set
      shippingZones: ['tamilnadu', 'south', 'north', 'east', 'west']
        .filter(z => formData.shippingZones[z] !== '' && formData.shippingZones[z] !== null && formData.shippingZones[z] !== undefined)
        .map(z => ({ zone: z, charge: parseFloat(formData.shippingZones[z]) })),
      delhiveryEnabled: formData.delhiveryEnabled,
      taxRate: formData.taxRate ? parseFloat(formData.taxRate) : 0,
      taxIncluded: formData.taxIncluded,
      // Warranty - convert duration from empty string to undefined
      warranty: {
        ...formData.warranty,
        duration: formData.warranty.duration ? parseInt(formData.warranty.duration, 10) : undefined,
      },
      // SEO Data
      seo: {
        title: formData.seoTitle || formData.title, // Fallback to product title
        description: formData.seoDescription || formData.description.substring(0, 160), // Fallback to first 160 chars
        keywords: formData.seoKeywords.split(',').map(keyword => keyword.trim()).filter(Boolean),
      },
      // FAQ Data
      faqs: faqs.filter(faq => faq.question && faq.answer), // Only include FAQs with both question and answer
      // Specifications Data
      specifications: specifications.filter(spec => spec.label && spec.value), // Only include specifications with both label and value
    };
    console.log('Submitting product data:', { price: dataToSubmit.price, compareAt: dataToSubmit.compareAt });
    saveMutation.mutate(dataToSubmit);
  };

  const addFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
  };

  const updateFaq = (index, field, value) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  const removeFaq = (index) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const addSpecification = () => {
    setSpecifications([...specifications, { label: '', value: '' }]);
  };

  const updateSpecification = (index, field, value) => {
    const updated = [...specifications];
    updated[index][field] = value;
    setSpecifications(updated);
  };

  const removeSpecification = (index) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
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

            {/* Vendor Assignment */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Vendor <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                disabled={isViewing}
                className="input w-full"
                required
              >
                <option value="">Select a vendor</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.storeName} ({v.userId?.email || v.status})
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
                value={formData.compareAt}
                onChange={(e) => setFormData({ ...formData, compareAt: e.target.value })}
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
                Display Order
                <span className="text-xs text-gray-500 ml-1">(higher = appears first)</span>
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                disabled={isViewing}
                className={`input w-full ${parseInt(formData.displayOrder) > 0 && allProducts.some(p => p._id !== product?._id && parseInt(p.displayOrder) === parseInt(formData.displayOrder)) ? 'border-yellow-400 focus:border-yellow-500' : ''}`}
              />
              {(() => {
                const val = parseInt(formData.displayOrder);
                const conflict = val > 0 && allProducts.find(p => p._id !== product?._id && parseInt(p.displayOrder) === val);
                if (conflict) return (
                  <p className="text-xs text-yellow-600 mt-1 font-medium">
                    ⚠ Same number already used by "{conflict.title}" — use a different number to set a unique position
                  </p>
                );
                return <p className="text-xs text-gray-400 mt-1">e.g. set 10 to pin this product to the top, 0 = normal order</p>;
              })()}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 2.5"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                disabled={isViewing}
                className="input w-full"
              />
              <p className="text-xs text-gray-400 mt-1">Used to calculate shipping cost</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Shipping Charge (₹)</label>
              <input
                type="number"
                min="0"
                placeholder="0 = auto calculate"
                value={formData.shippingCharge}
                onChange={(e) => setFormData({ ...formData, shippingCharge: e.target.value })}
                disabled={isViewing}
                className="input w-full"
              />
              <p className="text-xs text-gray-400 mt-1">Set a flat amount for all zones, or use zone-based pricing below</p>
            </div>

            {/* Zone-Based Shipping */}
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zone-Based Shipping Charges (₹)
                <span className="ml-2 text-xs text-blue-600 font-normal">Overrides fixed charge above</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { key: 'tamilnadu', label: 'Tamil Nadu', states: 'Tamil Nadu only' },
                  { key: 'south', label: 'South India', states: 'Kerala, Karnataka, AP, Telangana' },
                  { key: 'north', label: 'North India', states: 'Delhi, UP, Punjab, Haryana, Rajasthan' },
                  { key: 'east',  label: 'East India',  states: 'WB, Bihar, Odisha, Assam, NE States' },
                  { key: 'west',  label: 'West India',  states: 'Maharashtra, Gujarat, Goa, MP' },
                ].map(({ key, label, states }) => (
                  <div key={key} className="flex flex-col border border-gray-200 rounded-lg p-3 bg-gray-50 h-full">
                    <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
                    <p className="text-xs text-gray-400 mb-2 flex-1">{states}</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="₹ amount"
                      value={formData.shippingZones[key]}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, shippingZones: { ...formData.shippingZones, [key]: val } });
                      }}
                      disabled={isViewing}
                      className="input w-full text-sm mt-auto"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                At checkout, the highest zone charge across all cart products is used. Leave blank to fall back to weight-based pricing.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delhivery Shipping</label>
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${formData.delhiveryEnabled ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <input
                  type="checkbox"
                  checked={formData.delhiveryEnabled}
                  onChange={(e) => setFormData({ ...formData, delhiveryEnabled: e.target.checked })}
                  disabled={isViewing}
                  className="h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className={`text-sm font-medium ${formData.delhiveryEnabled ? 'text-green-700' : 'text-red-700'}`}>
                  {formData.delhiveryEnabled ? '✓ Delhivery Available' : '✗ Delhivery Not Available'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Uncheck if this product cannot be shipped via Delhivery (oversize, fragile, etc.)</p>
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
          <div className="md:col-span-2 bg-blue-100 p-4 rounded-lg border border-gray-200 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">GST/Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.taxable}
                    onChange={(e) => setFormData({ ...formData, taxable: e.target.checked })}
                    disabled={isViewing}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Product is taxable</span>
                </label>
              </div>

              {formData.taxable && (
                <>
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      HSN/SAC Code
                    </label>
                    <input
                      type="text"
                      value={formData.hsnCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, hsnCode: val });
                      }}
                      disabled={isViewing}
                      className="input w-full"
                      placeholder="e.g., 8509"
                      maxLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Required for GST invoices (4-8 digits)
                    </p>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.taxIncluded}
                        onChange={(e) => setFormData({ ...formData, taxIncluded: e.target.checked })}
                        disabled={isViewing}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Tax included in price</span>
                    </label>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-gray-700 mt-2">
              {formData.taxable && formData.taxIncluded
                ? '✓ Tax is already included in the displayed price'
                : formData.taxable
                ? 'Tax will be added at checkout'
                : 'Product price is considered tax-free'}
            </p>
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

          {/* Product Specifications Section */}
          <div className="md:col-span-2 bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Product Specifications (Optional)
                </h3>
                <p className="text-xs text-gray-700 mt-1">Add technical details like weight, dimensions, material, color, power, etc.</p>
              </div>
              {!isViewing && (
                <button
                  type="button"
                  onClick={addSpecification}
                  className="px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium"
                >
                  + Add Spec
                </button>
              )}
            </div>
            {specifications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {specifications.map((spec, index) => (
                  <div key={index} className="bg-white rounded-lg border border-orange-300 p-3 relative">
                    {!isViewing && (
                      <button
                        type="button"
                        onClick={() => removeSpecification(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div className="pr-6">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                      <input
                        type="text"
                        value={spec.label}
                        onChange={(e) => updateSpecification(index, 'label', e.target.value)}
                        disabled={isViewing}
                        placeholder="e.g., Weight, Color, Material"
                        className="input w-full text-sm mb-2"
                      />
                      <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                      <input
                        type="text"
                        value={spec.value}
                        onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                        disabled={isViewing}
                        placeholder="e.g., 2.5 kg, Silver, Stainless Steel"
                        className="input w-full text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 text-center py-4">
                No specifications added yet. Click "+ Add Spec" to add technical details.
              </p>
            )}
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
              {images.length > 0 && (
                <span className="text-gray-500 text-xs ml-2">({images.length} {images.length === 1 ? 'image' : 'images'})</span>
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
            
            {/* Image Gallery with Alt Tags */}
            {images.length > 0 ? (
              <div className="space-y-3">
                {images.map((image, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="relative group flex-shrink-0">
                      <img
                        src={image.url}
                        alt={image.alt || `${formData.title || 'Product'} - Image ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border border-gray-200"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                        }}
                      />
                      {!isViewing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          title="Remove image"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Image {index + 1} Alt Tag (SEO)
                        </label>
                        {!isViewing && (
                          <button
                            type="button"
                            onClick={() => {
                              const autoAlt = `${formData.title || 'Product'}${formData.brand ? ` by ${formData.brand}` : ''} - Image ${index + 1}`;
                              handleUpdateImageAlt(index, autoAlt);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                          >
                            Auto-generate
                          </button>
                        )}
                      </div>
                      {isViewing ? (
                        <p className="text-sm text-gray-600">{image.alt || 'No alt tag set'}</p>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={image.alt}
                            onChange={(e) => handleUpdateImageAlt(index, e.target.value)}
                            placeholder={`e.g., ${formData.title || 'Product name'} front view`}
                            className={`input w-full text-sm ${
                              image.alt.length >= 40 && image.alt.length <= 125
                                ? 'border-green-400 focus:border-green-500 focus:ring-green-200'
                                : image.alt.length > 0 && image.alt.length < 40
                                ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-200'
                                : image.alt.length > 125
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                                : ''
                            }`}
                            maxLength={150}
                          />
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">
                              Include product name, brand, color
                            </p>
                            <span className={`text-xs font-medium ${
                              image.alt.length >= 40 && image.alt.length <= 125
                                ? 'text-green-600'
                                : image.alt.length > 0 && image.alt.length < 40
                                ? 'text-yellow-600'
                                : image.alt.length > 125
                                ? 'text-red-600'
                                : 'text-gray-400'
                            }`}>
                              {image.alt.length}/125
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-blue-100 rounded-lg border border-gray-200">
                <p className="text-gray-500 text-sm">📷 No images uploaded yet</p>
                {!isViewing && (
                  <p className="text-gray-400 text-xs mt-1">Upload images using the button above</p>
                )}
              </div>
            )}
          </div>

          {/* Warranty Section */}
          <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-blue-100">
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

          {/* FAQ Section */}
          {!isViewing && (
            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Frequently Asked Questions (FAQ)
                  </h3>
                  <p className="text-xs text-gray-700 mt-1">Add common questions and answers about your product</p>
                </div>
                <button
                  type="button"
                  onClick={addFaq}
                  className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
                >
                  + Add FAQ
                </button>
              </div>

              <div className="space-y-3">
                {faqs.length === 0 ? (
                  <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500 text-sm">No FAQs added yet. Click "+ Add FAQ" to add common questions about your product.</p>
                  </div>
                ) : (
                  faqs.map((faq, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">FAQ #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeFaq(index)}
                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question
                          </label>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => updateFaq(index, 'question', e.target.value)}
                            placeholder="e.g., What is the product size?"
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Answer
                          </label>
                          <textarea
                            value={faq.answer}
                            onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                            placeholder="e.g., The product measures 10 x 5 x 3 inches..."
                            rows={3}
                            className="input w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {faqs.length > 0 && (
                <p className="text-xs text-gray-700 mt-3">
                  💡 Tip: FAQs help customers make informed purchase decisions and reduce support queries.
                </p>
              )}
            </div>
          )}

          {/* SEO Meta Tags Section */}
          {!isViewing && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  SEO Settings (Search Engine Optimization)
                </h3>
                <p className="text-xs text-gray-700 mt-1">Optimize this product for Google search results</p>
              </div>

              <div className="space-y-4">
                {/* SEO Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Title
                    <span className="text-gray-500 font-normal ml-2">(50-60 characters recommended)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                    placeholder={`${formData.title || 'Product title'} - V-Tech Kitchen`}
                    className="input w-full"
                    maxLength={60}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500">Used in Google search results title</span>
                    <span className={formData.seoTitle.length > 60 ? 'text-red-600' : 'text-gray-500'}>
                      {formData.seoTitle.length}/60
                    </span>
                  </div>
                </div>

                {/* SEO Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Description
                    <span className="text-gray-500 font-normal ml-2">(150-160 characters recommended)</span>
                  </label>
                  <textarea
                    value={formData.seoDescription}
                    onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                    placeholder="Brief description of your product that appears in search results..."
                    rows={3}
                    className="input w-full"
                    maxLength={160}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500">Displayed under the title in search results</span>
                    <span className={formData.seoDescription.length > 160 ? 'text-red-600' : 'text-gray-500'}>
                      {formData.seoDescription.length}/160
                    </span>
                  </div>
                </div>

                {/* SEO Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Focus Keywords
                    <span className="text-gray-500 font-normal ml-2">(Comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.seoKeywords}
                    onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
                    placeholder="kitchen appliances, cookware, premium utensils"
                    className="input w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Keywords your customers might search for (helps with SEO ranking)
                  </p>
                </div>

                {/* SEO Preview */}
                {(formData.seoTitle || formData.seoDescription) && (
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Google Search Preview:</p>
                    <div className="space-y-1">
                      <div className="text-lg text-blue-700 hover:underline cursor-pointer font-medium">
                        {formData.seoTitle || formData.title} - V-Tech Kitchen
                      </div>
                      <div className="text-xs text-green-700">
                        https://vtechkitchen.com/products/{formData.title?.toLowerCase().replace(/\s+/g, '-')}
                      </div>
                      <div className="text-sm text-gray-700">
                        {formData.seoDescription || formData.description.substring(0, 160)}
                        {formData.seoDescription?.length === 160 && '...'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
                  <div className="bg-blue-100 p-4 rounded border border-gray-200">
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

          {saveMutation.isError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">
              <strong>Save failed:</strong>{' '}
              {(() => {
                const errData = saveMutation.error?.response?.data?.error;
                const fieldErrors = errData?.fields;
                if (fieldErrors && Object.keys(fieldErrors).length > 0) {
                  return Object.entries(fieldErrors).map(([f, m]) => `${f}: ${m}`).join(' | ');
                }
                return errData?.message || saveMutation.error?.message || 'Unknown error';
              })()}
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