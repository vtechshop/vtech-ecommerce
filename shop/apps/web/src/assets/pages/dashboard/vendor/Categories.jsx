// FILE: apps/web/src/pages/dashboard/vendor/Categories.jsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import useAuth from '@/hooks/useAuth';
import { Plus, Edit, Trash2, X, FolderTree, Folder, ZoomIn, Upload, Clock, Search, ChevronDown, ChevronRight, Package, LayoutGrid, User, AlertTriangle, ShieldCheck, PlusCircle, PackagePlus } from 'lucide-react';

const Categories = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [assigningCategory, setAssigningCategory] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  // Fetch categories with product counts
  const { data: categories, isLoading } = useQuery({
    queryKey: ['vendor-categories'],
    queryFn: async () => {
      const response = await api.get('/vendors/categories?includeInactive=true');
      return response.data.data;
    },
  });

  // Fetch category stats
  const { data: stats } = useQuery({
    queryKey: ['vendor-category-stats'],
    queryFn: async () => {
      const response = await api.get('/vendors/categories/stats');
      return response.data.data;
    },
  });

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchQuery) return categories;

    const query = searchQuery.toLowerCase();
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(query) ||
      cat.slug.toLowerCase().includes(query) ||
      cat.description?.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  // Get parent categories
  const parentCategories = useMemo(() => {
    return filteredCategories.filter(cat => !cat.parentId);
  }, [filteredCategories]);

  // Get child categories for a parent
  const getChildCategories = (parentId) => {
    return filteredCategories.filter(cat => cat.parentId === parentId);
  };

  // Toggle expand/collapse
  const toggleExpand = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Expand all by default when there's a search query
  const isExpanded = (categoryId) => {
    if (searchQuery) return true;
    return expandedCategories[categoryId] ?? true; // Default expanded
  };

  const createMutation = useMutation({
    mutationFn: async (data) => api.post('/vendors/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-categories'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-category-stats'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowModal(false);
      setEditingCategory(null);
      showToastMsg('Category created successfully!', 'success');
    },
    onError: (error) => {
      showToastMsg(error.response?.data?.error?.message || 'Failed to create category', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => api.put(`/vendors/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-categories'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-category-stats'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowModal(false);
      setEditingCategory(null);
      showToastMsg('Category updated successfully!', 'success');
    },
    onError: (error) => {
      showToastMsg(error.response?.data?.error?.message || 'Failed to update category', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/vendors/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-categories'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-category-stats'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToastMsg('Delete request submitted. Admin will review it.', 'success');
    },
    onError: (error) => {
      showToastMsg(error.response?.data?.error?.message || 'Failed to request deletion', 'error');
    },
  });

  const showToastMsg = (message, type) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('Request admin to delete this category?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-0">
      {/* Toast */}
      {showToast && (
        <div className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
          toastType === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Category Management</h1>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Total Categories</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.totalCategories || 0}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Active</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{stats?.activeCategories || 0}</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
              <FolderTree className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Your Categories</p>
              <p className="text-xl sm:text-2xl font-bold text-primary-600">{stats?.yourCategories || 0}</p>
            </div>
            <div className="p-2 sm:p-3 bg-primary-100 rounded-lg flex-shrink-0">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">With Products</p>
              <p className="text-xl sm:text-2xl font-bold text-secondary-600">{stats?.categoriesWithProducts || 0}</p>
            </div>
            <div className="p-2 sm:p-3 bg-secondary-100 rounded-lg flex-shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-secondary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Deletion Alert */}
      {stats?.pendingDeletion > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-amber-800">
            <span className="font-semibold">{stats.pendingDeletion} categor{stats.pendingDeletion > 1 ? 'ies' : 'y'}</span> pending admin approval for deletion
          </p>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 sm:pl-10 w-full text-sm sm:text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            Found {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'} matching "{searchQuery}"
          </p>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-3">
        {parentCategories.map((parent) => {
          const children = getChildCategories(parent._id);
          const hasChildren = children.length > 0;
          const expanded = isExpanded(parent._id);

          return (
            <div key={parent._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Parent Category Card */}
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  {parent.image ? (
                    <img src={parent.image} alt={parent.name} className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FolderTree className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900">{parent.name}</h3>
                      {parent.createdBy === user?._id ? (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>
                      ) : (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" /> Admin
                        </span>
                      )}
                      {hasChildren && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                          {children.length} sub
                        </span>
                      )}
                    </div>
                    {parent.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{parent.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <code className="text-xs bg-blue-100 px-1.5 py-0.5 rounded">{parent.slug}</code>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        parent.productCount > 0 ? 'text-green-700' : 'text-gray-400'
                      }`}>
                        <Package className="w-3 h-3" />
                        {parent.productCount || 0} products
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Actions Row */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                      parent.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {parent.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {parent.deleteRequested && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {hasChildren && (
                      <button
                        onClick={() => toggleExpand(parent._id)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => setAssigningCategory(parent)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      title="Add Products to Category"
                    >
                      <PackagePlus className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/vendor-dashboard/products?action=add&category=${parent._id}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Create New Product"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </Link>
                    {parent.createdBy === user?._id && (
                      <>
                        <button onClick={() => handleEdit(parent)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </button>
                        {!parent.deleteRequested && (
                          <button onClick={() => handleDelete(parent._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Subcategories */}
              {expanded && children.length > 0 && (
                <div className="bg-gray-50 border-t border-gray-200">
                  {children.map((child) => (
                    <div key={child._id} className="p-3 sm:p-4 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-start gap-3 ml-4">
                        <span className="text-gray-300 mt-2">└─</span>
                        {child.image ? (
                          <img src={child.image} alt={child.name} className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Folder className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-medium text-gray-700">{child.name}</h4>
                            {child.createdBy === user?._id ? (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>
                            ) : (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                <ShieldCheck className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <code className="text-xs bg-blue-100 px-1.5 py-0.5 rounded">{child.slug}</code>
                            <span className={`inline-flex items-center gap-1 text-xs ${
                              child.productCount > 0 ? 'text-green-700' : 'text-gray-400'
                            }`}>
                              <Package className="w-3 h-3" />
                              {child.productCount || 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setAssigningCategory(child)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Add Products to Category"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/vendor-dashboard/products?action=add&category=${child._id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Create New Product"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </Link>
                          {child.createdBy === user?._id && (
                            <>
                              <button onClick={() => handleEdit(child)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                <Edit className="w-4 h-4" />
                              </button>
                              {!child.deleteRequested && (
                                <button onClick={() => handleDelete(child._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-blue-100 border-b border-gray-200">
              <tr>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sort</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {parentCategories.map((parent) => {
                const children = getChildCategories(parent._id);
                const hasChildren = children.length > 0;
                const expanded = isExpanded(parent._id);

                return (
                  <React.Fragment key={parent._id}>
                    <tr className="hover:bg-blue-50">
                      <td className="px-4 xl:px-6 py-4">
                        <div className="flex items-center gap-2">
                          {hasChildren && (
                            <button
                              onClick={() => toggleExpand(parent._id)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              {expanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              )}
                            </button>
                          )}
                          {!hasChildren && <div className="w-6" />}
                          {parent.image ? (
                            <img src={parent.image} alt={parent.name} className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FolderTree className="w-5 h-5 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {parent.name}
                              {parent.createdBy === user?._id ? (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>
                              ) : (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5" /> Admin
                                </span>
                              )}
                              {hasChildren && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                                  {children.length} sub
                                </span>
                              )}
                            </div>
                            {parent.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">{parent.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 xl:px-6 py-4">
                        <code className="text-sm bg-blue-100 px-2 py-1 rounded">{parent.slug}</code>
                      </td>
                      <td className="px-4 xl:px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                          parent.productCount > 0 ? 'text-green-700' : 'text-gray-400'
                        }`}>
                          <Package className="w-4 h-4" />
                          {parent.productCount || 0}
                        </span>
                      </td>
                      <td className="px-4 xl:px-6 py-4 text-sm text-gray-700">{parent.sortOrder || 0}</td>
                      <td className="px-4 xl:px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-block w-fit px-2 py-1 text-xs font-semibold rounded-full ${
                            parent.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {parent.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {parent.deleteRequested && (
                            <span className="inline-flex items-center gap-1 w-fit px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                              <Clock className="w-3 h-3" /> Delete Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 xl:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAssigningCategory(parent)}
                            className="text-green-600 hover:text-green-800 p-1.5 hover:bg-green-50 rounded inline-flex items-center gap-1 text-xs font-medium"
                            title="Assign existing products to this category"
                          >
                            <PackagePlus className="w-4 h-4" />
                            <span className="hidden xl:inline">Add Products</span>
                          </button>
                          <Link
                            to={`/vendor-dashboard/products?action=add&category=${parent._id}`}
                            className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded inline-flex items-center gap-1 text-xs font-medium"
                            title="Create new product in this category"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span className="hidden xl:inline">New Product</span>
                          </Link>
                          {parent.createdBy === user?._id && (
                            <>
                              <button onClick={() => handleEdit(parent)} className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded" title="Edit">
                                <Edit className="w-4 h-4" />
                              </button>
                              {!parent.deleteRequested && (
                                <button onClick={() => handleDelete(parent._id)} className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded" title="Request deletion">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Subcategories */}
                    {expanded && children.map((child) => (
                      <tr key={child._id} className="hover:bg-blue-50 bg-gray-50">
                        <td className="px-4 xl:px-6 py-4">
                          <div className="flex items-center gap-2 ml-12">
                            <span className="text-gray-300">└─</span>
                            {child.image ? (
                              <img src={child.image} alt={child.name} className="w-8 h-8 object-cover rounded-lg border border-gray-200" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Folder className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                {child.name}
                                {child.createdBy === user?._id ? (
                                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>
                                ) : (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                    <ShieldCheck className="w-2.5 h-2.5" /> Admin
                                  </span>
                                )}
                              </div>
                              {child.description && (
                                <div className="text-xs text-gray-500 truncate max-w-xs">{child.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 xl:px-6 py-4">
                          <code className="text-xs bg-blue-100 px-2 py-1 rounded">{child.slug}</code>
                        </td>
                        <td className="px-4 xl:px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                            child.productCount > 0 ? 'text-green-700' : 'text-gray-400'
                          }`}>
                            <Package className="w-3.5 h-3.5" />
                            {child.productCount || 0}
                          </span>
                        </td>
                        <td className="px-4 xl:px-6 py-4 text-sm text-gray-700">{child.sortOrder || 0}</td>
                        <td className="px-4 xl:px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-block w-fit px-2 py-1 text-xs font-semibold rounded-full ${
                              child.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {child.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {child.deleteRequested && (
                              <span className="inline-flex items-center gap-1 w-fit px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                                <Clock className="w-3 h-3" /> Delete Pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 xl:px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setAssigningCategory(child)}
                              className="text-green-600 hover:text-green-800 p-1.5 hover:bg-green-50 rounded inline-flex items-center gap-1 text-xs font-medium"
                              title="Assign existing products to this category"
                            >
                              <PackagePlus className="w-4 h-4" />
                              <span className="hidden xl:inline">Add Products</span>
                            </button>
                            <Link
                              to={`/vendor-dashboard/products?action=add&category=${child._id}`}
                              className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded inline-flex items-center gap-1 text-xs font-medium"
                              title="Create new product in this category"
                            >
                              <PlusCircle className="w-4 h-4" />
                              <span className="hidden xl:inline">New Product</span>
                            </Link>
                            {child.createdBy === user?._id && (
                              <>
                                <button onClick={() => handleEdit(child)} className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded" title="Edit">
                                  <Edit className="w-4 h-4" />
                                </button>
                                {!child.deleteRequested && (
                                  <button onClick={() => handleDelete(child._id)} className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded" title="Request deletion">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!categories || categories.length === 0) && (
          <div className="text-center py-12">
            <FolderTree className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No categories found. Create your first category!</p>
          </div>
        )}
        {categories && categories.length > 0 && filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No categories match your search.</p>
          </div>
        )}
      </div>

      {/* Mobile Empty State */}
      {parentCategories.length === 0 && (
        <div className="block lg:hidden text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          {categories && categories.length > 0 ? (
            <>
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No categories match your search.</p>
            </>
          ) : (
            <>
              <FolderTree className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No categories found. Create your first category!</p>
            </>
          )}
        </div>
      )}

      {/* Category Modal */}
      {showModal && (
        <CategoryModal
          category={editingCategory}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditingCategory(null);
          }}
          onSave={(data) => {
            if (editingCategory) {
              updateMutation.mutate({ id: editingCategory._id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Assign Products Modal */}
      {assigningCategory && (
        <AssignProductsModal
          category={assigningCategory}
          onClose={() => setAssigningCategory(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['vendor-categories'] });
            queryClient.invalidateQueries({ queryKey: ['vendor-category-stats'] });
            showToastMsg('Products assigned to category successfully!', 'success');
            setAssigningCategory(null);
          }}
        />
      )}
    </div>
  );
};

// Assign Products to Category Modal
const AssignProductsModal = ({ category, onClose, onSuccess }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-assign-products-list'],
    queryFn: async () => {
      const res = await api.get('/vendors/products?limit=500');
      return res.data.data || [];
    },
    staleTime: 30000,
  });

  React.useEffect(() => {
    if (data) {
      const preSelected = new Set(
        data.filter(p => p.categoryIds?.map(String).includes(String(category._id))).map(p => p._id)
      );
      setSelected(preSelected);
    }
  }, [data, category._id]);

  const filtered = (data || []).filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleProduct = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (filtered.every(p => selected.has(p._id))) {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(p => next.delete(p._id)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(p => next.add(p._id)); return next; });
    }
  };

  const handleSave = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await api.post('/vendors/products/assign-category', {
        categoryId: category._id,
        productIds: [...selected],
      });
      onSuccess();
    } catch (e) {
      alert(e.response?.data?.error?.message || 'Failed to assign products');
    } finally {
      setSaving(false);
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p._id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-gray-50 rounded-t-2xl sm:rounded-t-xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Products to Category</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-medium text-blue-700">{category.name}</span>
              {selected.size > 0 && <span className="ml-2 text-green-700 font-medium">· {selected.size} selected</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 w-full text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Select all */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 sm:px-6 py-2 border-b bg-gray-50 flex items-center gap-3">
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="w-4 h-4 rounded text-blue-600" />
            <span className="text-xs font-medium text-gray-600">
              {allFilteredSelected ? 'Deselect all' : `Select all ${filtered.length} shown`}
            </span>
          </div>
        )}

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-1.5">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            filtered.map(product => {
              const isSelected = selected.has(product._id);
              const alreadyIn = product.categoryIds?.map(String).includes(String(category._id));
              return (
                <label
                  key={product._id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                    isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input type="checkbox" checked={isSelected} onChange={() => toggleProduct(product._id)} className="w-4 h-4 rounded text-blue-600 flex-shrink-0" />
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.title} className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{product.title}</div>
                    <div className="text-xs text-gray-500">₹{product.price?.toLocaleString('en-IN')} {product.sku && `· ${product.sku}`}</div>
                  </div>
                  {alreadyIn && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">In category</span>
                  )}
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl sm:rounded-b-xl">
          <span className="text-sm text-gray-500">{selected.size} product{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving || selected.size === 0} className="flex-1 sm:flex-none">
              {saving ? 'Assigning...' : `Assign ${selected.size > 0 ? selected.size : ''} Product${selected.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Category Modal Component
const CategoryModal = ({ category, categories, onClose, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    image: category?.image || '',
    parentId: category?.parentId || null,
    isActive: category?.isActive ?? true,
    sortOrder: category?.sortOrder || 0,
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageZoom, setImageZoom] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('files', file);
      const response = await api.post('/upload/multiple', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = response?.data?.data?.[0]?.url;
      if (url) setFormData(prev => ({ ...prev, image: url }));
    } catch (error) {
      alert('Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (e) => {
    const name = e.target.value;
    const autoSlug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData({
      ...formData,
      name,
      slug: !category ? autoSlug : formData.slug
    });
  };

  const handleSlugChange = (e) => {
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^\w-]/g, '')
      .replace(/^-+|-+$/g, '');
    setFormData({ ...formData, slug });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const parentCategories = categories?.filter(cat =>
    !cat.parentId && cat._id !== category?._id
  ) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-gray-50 rounded-t-2xl sm:rounded-t-xl">
          <h2 className="text-lg font-bold text-gray-900">
            {category ? 'Edit Category' : 'Create New Category'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category Image</label>
              {formData.image ? (
                <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="relative w-full h-36 sm:h-44 flex items-center justify-center bg-gray-50">
                    <img src={formData.image} alt="Category" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex items-center justify-between px-2 sm:px-3 py-2 bg-gray-50 border-t">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button type="button" onClick={() => setImageZoom(true)} className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-100 transition-colors">
                        <ZoomIn className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Preview</span>
                      </button>
                      <label className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-100 transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Replace</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={imageUploading} className="hidden" />
                      </label>
                    </div>
                    <button type="button" onClick={() => setFormData({ ...formData, image: '' })} className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 sm:h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-2" />
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Click to upload image</span>
                  <span className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, SVG supported</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={imageUploading} className="hidden" />
                </label>
              )}
              {imageUploading && (
                <div className="flex items-center gap-2 mt-2 text-sm text-primary-600">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                  Uploading...
                </div>
              )}
            </div>

            {/* Image Zoom Modal */}
            {imageZoom && formData.image && (
              <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setImageZoom(false)}>
                <div className="relative max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => setImageZoom(false)} className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                  <img src={formData.image} alt="Category Preview" className="w-full h-full object-contain rounded-lg" />
                </div>
              </div>
            )}

            {/* Name & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleNameChange}
                  className="input w-full"
                  required
                  placeholder="e.g., Electronics"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Slug <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  className="input w-full font-mono text-sm"
                  required
                  placeholder="e.g., electronics"
                />
                <p className="text-xs text-gray-400 mt-1">Auto-generated from name</p>
              </div>
            </div>

            {/* Parent & Sort Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Parent Category</label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                  className="input w-full"
                >
                  <option value="">None (Top Level)</option>
                  {parentCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input w-full"
                rows={3}
                placeholder="Brief description of this category"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">Status</label>
                <p className="text-xs text-gray-500">Inactive categories are hidden from customers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl sm:rounded-b-xl">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 sm:flex-none">
              {isLoading ? 'Saving...' : category ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Categories;
