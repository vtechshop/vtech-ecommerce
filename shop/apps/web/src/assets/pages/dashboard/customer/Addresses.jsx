
// FILE: apps/web/src/pages/dashboard/customer/Addresses.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import Spinner from '@/components/common/Spinner';

const Addresses = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    isDefault: false,
  });

  const { data: addresses, isLoading, error } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const response = await api.get('/user/addresses');
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/user/addresses', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Failed to add address:', error);
      alert(error.response?.data?.error?.message || 'Failed to add address. Please try again.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/user/addresses/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Failed to update address:', error);
      alert(error.response?.data?.error?.message || 'Failed to update address. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/user/addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (error) => {
      console.error('Failed to delete address:', error);
      alert(error.response?.data?.error?.message || 'Failed to delete address. Please try again.');
    },
  });

  const resetForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
      isDefault: false,
    });
    setEditingAddress(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setFormData({
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      isDefault: address.isDefault || false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold text-red-800 mb-2">Error Loading Addresses</h3>
        <p className="text-red-600 mb-4">{error.response?.data?.error?.message || error.message || 'Failed to load addresses'}</p>
        <p className="text-sm text-gray-700">Please make sure you are logged in and try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Addresses</h1>
        <Button onClick={handleAdd} variant="primary">
          Add New Address
        </Button>
      </div>

      {addresses && addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div key={address._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              {address.isDefault && (
                <span className="inline-block px-2 py-1 bg-primary-100 text-blue-600 text-xs font-semibold rounded mb-3">
                  Default
                </span>
              )}
              <h3 className="font-semibold text-lg mb-2">{address.fullName}</h3>
              <p className="text-gray-700 text-sm mb-1">{address.phone}</p>
              <p className="text-gray-700 text-sm mb-1">{address.addressLine1}</p>
              {address.addressLine2 && (
                <p className="text-gray-700 text-sm mb-1">{address.addressLine2}</p>
              )}
              <p className="text-gray-700 text-sm mb-4">
                {address.city}, {address.state} {address.zipCode}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(address)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(address._id)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">No addresses saved</h3>
          <p className="text-gray-700 mb-6">Add an address for faster checkout</p>
          <Button onClick={handleAdd} variant="primary">
            Add Address
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingAddress ? 'Edit Address' : 'Add New Address'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Full Name"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
            <Input
              label="Phone"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <Input
            label="Address Line 1"
            required
            fullWidth
            className="mb-4"
            value={formData.addressLine1}
            onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
          />
          <Input
            label="Address Line 2 (Optional)"
            fullWidth
            className="mb-4"
            value={formData.addressLine2}
            onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              label="City"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="State/Province"
              required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="ZIP/Postal Code"
              required
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
            />
          </div>
          <Input
            label="Country"
            required
            fullWidth
            className="mb-4"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          />
          <div className="flex items-center mb-6">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
              Set as default address
            </label>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingAddress ? 'Update' : 'Add'} Address
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Addresses;