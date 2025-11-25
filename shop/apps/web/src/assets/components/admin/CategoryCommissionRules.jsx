// Category-Based Commission Rules Component
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import { useToast } from '@/components/common/ToastContainer';
import { Plus, Trash2, Save, Percent } from 'lucide-react';

/**
 * Component for managing category-based commission rules
 * @param {Object} props
 * @param {string} props.type - 'vendor', 'affiliate', or 'product'
 * @param {string} props.entityId - ID of the vendor/affiliate/product
 * @param {Array} props.existingRules - Existing commission rules
 * @param {Function} props.onUpdate - Callback after successful update
 */
const CategoryCommissionRules = ({ type, entityId, existingRules = [], onUpdate }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [rules, setRules] = useState([]);

  // Fetch all categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-all'],
    queryFn: async () => {
      const response = await api.get('/catalog/categories?limit=100');
      return response.data.data;
    },
  });

  const categories = categoriesData || [];

  useEffect(() => {
    if (existingRules && existingRules.length > 0) {
      setRules(existingRules.map(rule => ({
        categoryId: rule.categoryId?._id || rule.categoryId,
        percentage: rule.percentage || 0
      })));
    }
  }, [existingRules]);

  const addRule = () => {
    setRules([...rules, { categoryId: '', percentage: 0 }]);
  };

  const removeRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index, field, value) => {
    const newRules = [...rules];
    newRules[index][field] = field === 'percentage' ? parseFloat(value) || 0 : value;
    setRules(newRules);
  };

  const updateRulesMutation = useMutation({
    mutationFn: async (commissionRules) => {
      let endpoint = '';
      let payload = {};

      if (type === 'vendor') {
        endpoint = `/admin/vendors/${entityId}/commission-rules`;
        payload = { commissionRules };
      } else if (type === 'affiliate') {
        endpoint = `/admin/affiliates/${entityId}/commission-rules`;
        payload = { commissionRules };
      } else if (type === 'product') {
        endpoint = `/admin/products/${entityId}/commission-rules`;
        payload = {
          vendorCommissionRules: commissionRules.vendor || [],
          affiliateCommissionRules: commissionRules.affiliate || []
        };
      }

      const response = await api.put(endpoint, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Commission rules updated successfully');
      if (onUpdate) onUpdate();
      queryClient.invalidateQueries(['admin-vendors']);
      queryClient.invalidateQueries(['admin-affiliates']);
      queryClient.invalidateQueries(['admin-products']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update commission rules');
    },
  });

  const handleSave = () => {
    const validRules = rules.filter(rule => rule.categoryId && rule.percentage >= 0);
    updateRulesMutation.mutate(validRules);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c._id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getAvailableCategories = (currentIndex) => {
    const usedCategoryIds = rules
      .map((r, i) => i !== currentIndex && r.categoryId)
      .filter(Boolean);
    return categories.filter(c => !usedCategoryIds.includes(c._id));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-bold text-gray-900">
            Category-Based Commission Rules
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addRule}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Percent className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="font-medium">No category-based rules set</p>
          <p className="text-sm mt-1">Click "Add Rule" to set commission rates by category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={rule.categoryId}
                  onChange={(e) => updateRule(index, 'categoryId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="">Select category...</option>
                  {getAvailableCategories(index).map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                  {rule.categoryId && !getAvailableCategories(index).find(c => c._id === rule.categoryId) && (
                    <option value={rule.categoryId}>
                      {getCategoryName(rule.categoryId)}
                    </option>
                  )}
                </select>
              </div>

              <div className="w-32">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={rule.percentage}
                    onChange={(e) => updateRule(index, 'percentage', e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                  <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
                </div>
              </div>

              <button
                onClick={() => removeRule(index)}
                className="mt-5 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove rule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {rules.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {rules.filter(r => r.categoryId && r.percentage >= 0).length} active {rules.filter(r => r.categoryId && r.percentage >= 0).length === 1 ? 'rule' : 'rules'}
          </p>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={updateRulesMutation.isPending}
            icon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>How it works:</strong> When a product in one of these categories is sold,
          the commission percentage for that category will be used. If no rule matches,
          the default commission rate will apply.
        </p>
      </div>
    </div>
  );
};

export default CategoryCommissionRules;
