// FILE: apps/web/src/pages/dashboard/vendor/Inventory.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Spinner from '@/components/common/Spinner';

const Inventory = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: products, isLoading } = useQuery({
    queryKey: ['inventory', filter],
    queryFn: async () => {
      const lowStock = filter === 'low' ? 'true' : '';
      const response = await api.get(`/vendors/inventory?lowStock=${lowStock}`);
      return response.data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ productId, stock }) => {
      await api.put(`/vendors/inventory/${productId}`, { stock });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      alert('Stock updated successfully');
    },
  });

  const handleStockUpdate = (productId, newStock) => {
    updateMutation.mutate({ productId, stock: parseInt(newStock) });
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Products
          </Button>
          <Button
            variant={filter === 'low' ? 'primary' : 'outline'}
            onClick={() => setFilter('low')}
          >
            Low Stock
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-sm">Product</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">SKU</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Current Stock</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Low Stock Alert</th>
              <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((product) => (
              <tr key={product._id} className="border-b last:border-b-0">
                <td className="py-3 px-3 sm:px-4">
                  <p className="font-medium">{product.title}</p>
                </td>
                <td className="py-3 px-4 text-sm font-mono">{product.sku}</td>
                <td className="py-3 px-3 sm:px-4">
                  <span className={product.stock <= product.lowStockThreshold ? 'text-red-600 font-bold' : ''}>
                    {product.stock}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  {product.lowStockThreshold}
                </td>
                <td className="py-3 px-4 text-right">
                  <input
                    type="number"
                    min="0"
                    defaultValue={product.stock}
                    onBlur={(e) => handleStockUpdate(product._id, e.target.value)}
                    className="input w-24 text-right"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;