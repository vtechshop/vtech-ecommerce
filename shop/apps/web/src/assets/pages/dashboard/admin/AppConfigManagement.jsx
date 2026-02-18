// FILE: apps/web/src/assets/pages/dashboard/admin/AppConfigManagement.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save, X } from 'lucide-react';

const AppConfigManagement = () => {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-app-config'],
    queryFn: async () => {
      const res = await api.get('/config/app');
      return res.data;
    },
  });

  useEffect(() => {
    if (data?.data && !config) {
      setConfig(data.data);
    }
  }, [data, config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return api.put('/config/app', config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-app-config'] });
      toast.success('App config saved');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Save failed'),
  });

  if (isLoading || !config) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  const updateNested = (section, field, value) => {
    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [field]: value,
      },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">App Configuration</h1>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save All'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Contact Info */}
        <Section title="Contact Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email" value={config.contactInfo?.email || ''} onChange={(v) => updateNested('contactInfo', 'email', v)} />
            <Field label="Phone" value={config.contactInfo?.phone || ''} onChange={(v) => updateNested('contactInfo', 'phone', v)} />
            <Field label="WhatsApp" value={config.contactInfo?.whatsapp || ''} onChange={(v) => updateNested('contactInfo', 'whatsapp', v)} />
            <Field label="Website" value={config.contactInfo?.website || ''} onChange={(v) => updateNested('contactInfo', 'website', v)} />
            <Field label="Business Hours" value={config.contactInfo?.businessHours || ''} onChange={(v) => updateNested('contactInfo', 'businessHours', v)} />
            <Field label="Address" value={config.contactInfo?.address || ''} onChange={(v) => updateNested('contactInfo', 'address', v)} />
          </div>
        </Section>

        {/* About Page */}
        <Section title="About Page">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Field label="Company Name" value={config.aboutPage?.companyName || ''} onChange={(v) => updateNested('aboutPage', 'companyName', v)} />
            <Field label="Tagline" value={config.aboutPage?.tagline || ''} onChange={(v) => updateNested('aboutPage', 'tagline', v)} />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={config.aboutPage?.description || ''}
              onChange={(e) => updateNested('aboutPage', 'description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Stats</label>
              <button
                type="button"
                onClick={() => {
                  const stats = [...(config.aboutPage?.stats || []), { label: '', value: '', icon: '' }];
                  updateNested('aboutPage', 'stats', stats);
                }}
                className="text-primary-600 text-sm hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Stat
              </button>
            </div>
            {(config.aboutPage?.stats || []).map((stat, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={stat.label}
                  onChange={(e) => {
                    const stats = [...config.aboutPage.stats];
                    stats[i] = { ...stats[i], label: e.target.value };
                    updateNested('aboutPage', 'stats', stats);
                  }}
                  placeholder="Label (e.g. Happy Customers)"
                  className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={stat.value}
                  onChange={(e) => {
                    const stats = [...config.aboutPage.stats];
                    stats[i] = { ...stats[i], value: e.target.value };
                    updateNested('aboutPage', 'stats', stats);
                  }}
                  placeholder="Value (e.g. 1000+)"
                  className="w-32 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={stat.icon}
                  onChange={(e) => {
                    const stats = [...config.aboutPage.stats];
                    stats[i] = { ...stats[i], icon: e.target.value };
                    updateNested('aboutPage', 'stats', stats);
                  }}
                  placeholder="Icon name"
                  className="w-32 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => {
                    const stats = config.aboutPage.stats.filter((_, idx) => idx !== i);
                    updateNested('aboutPage', 'stats', stats);
                  }}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* Referral Program */}
        <Section title="Referral Program">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Field
              label="Referrer Reward (₹)"
              type="number"
              value={config.referralConfig?.referrerReward || 0}
              onChange={(v) => updateNested('referralConfig', 'referrerReward', parseFloat(v) || 0)}
            />
            <Field
              label="Referee Reward (₹)"
              type="number"
              value={config.referralConfig?.refereeReward || 0}
              onChange={(v) => updateNested('referralConfig', 'refereeReward', parseFloat(v) || 0)}
            />
            <Field
              label="Default Reward Amount (₹)"
              type="number"
              value={config.referralConfig?.rewardAmount || 0}
              onChange={(v) => updateNested('referralConfig', 'rewardAmount', parseFloat(v) || 0)}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.referralConfig?.isActive || false}
              onChange={(e) => updateNested('referralConfig', 'isActive', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Referral Program Active</span>
          </label>
        </Section>

        {/* Festival Sale */}
        <Section title="Festival Sale">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Field
              label="Sale Title"
              value={config.festivalSale?.title || ''}
              onChange={(v) => updateNested('festivalSale', 'title', v)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={config.festivalSale?.endDate ? config.festivalSale.endDate.slice(0, 16) : ''}
                onChange={(e) => updateNested('festivalSale', 'endDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={config.festivalSale?.isActive || false}
              onChange={(e) => updateNested('festivalSale', 'isActive', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Festival Sale Active</span>
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Sale Categories</label>
              <button
                type="button"
                onClick={() => {
                  const cats = [...(config.festivalSale?.categories || []), { name: '', searchQuery: '', icon: '', gradient: ['#4F46E5', '#7C3AED'] }];
                  updateNested('festivalSale', 'categories', cats);
                }}
                className="text-primary-600 text-sm hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Category
              </button>
            </div>
            {(config.festivalSale?.categories || []).map((cat, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => {
                    const cats = [...config.festivalSale.categories];
                    cats[i] = { ...cats[i], name: e.target.value };
                    updateNested('festivalSale', 'categories', cats);
                  }}
                  placeholder="Category Name"
                  className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={cat.searchQuery}
                  onChange={(e) => {
                    const cats = [...config.festivalSale.categories];
                    cats[i] = { ...cats[i], searchQuery: e.target.value };
                    updateNested('festivalSale', 'categories', cats);
                  }}
                  placeholder="Search Query"
                  className="w-32 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={cat.icon}
                  onChange={(e) => {
                    const cats = [...config.festivalSale.categories];
                    cats[i] = { ...cats[i], icon: e.target.value };
                    updateNested('festivalSale', 'categories', cats);
                  }}
                  placeholder="Icon"
                  className="w-28 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => {
                    const cats = config.festivalSale.categories.filter((_, idx) => idx !== i);
                    updateNested('festivalSale', 'categories', cats);
                  }}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* Gift Card Amounts */}
        <Section title="Gift Card Amounts">
          <div className="flex flex-wrap gap-2 mb-3">
            {(config.giftCardAmounts || []).map((amount, i) => (
              <div key={i} className="flex items-center gap-1 bg-gray-100 rounded-lg px-3 py-1">
                <span className="text-sm font-medium">₹{amount}</span>
                <button
                  onClick={() => {
                    setConfig({
                      ...config,
                      giftCardAmounts: config.giftCardAmounts.filter((_, idx) => idx !== i),
                    });
                  }}
                  className="text-red-500 hover:text-red-700 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              id="new-gift-amount"
              placeholder="New amount"
              className="w-32 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('new-gift-amount');
                const val = parseInt(input.value);
                if (val > 0) {
                  setConfig({
                    ...config,
                    giftCardAmounts: [...(config.giftCardAmounts || []), val].sort((a, b) => a - b),
                  });
                  input.value = '';
                }
              }}
              className="text-primary-600 text-sm hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </Section>
      </div>

      {/* Fixed save button at bottom */}
      <div className="flex justify-end mt-8 pb-4">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-bold mb-4">{title}</h3>
    {children}
  </div>
);

const Field = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
    />
  </div>
);

export default AppConfigManagement;
