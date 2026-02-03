// FILE: apps/web/src/pages/dashboard/admin/Settings.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { Save, RefreshCw, Globe, Mail, CreditCard, Shield, Bell, Volume2, VolumeX } from 'lucide-react';
import { getSoundEnabled, toggleSound, playClick } from '@/utils/sounds';

const Settings = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [editingSettings, setEditingSettings] = useState({});

  // Sound preferences
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setSoundEnabled(getSoundEnabled());
  }, []);

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    toggleSound(newValue);
    if (newValue) {
      setTimeout(() => playClick(), 50);
    }
  };

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings', activeTab],
    queryFn: async () => {
      const response = await api.get(`/admin/settings?category=${activeTab}`);
      return response.data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value, type, category, description }) => {
      await api.put(`/admin/settings/${key}`, { value, type, category, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      alert('Setting updated successfully');
    },
  });

  const handleEdit = (setting) => {
    setEditingSettings({
      ...editingSettings,
      [setting.key]: {
        value: setting.value,
        type: setting.type,
        category: setting.category,
        description: setting.description,
      },
    });
  };

  const handleSave = (key) => {
    const setting = editingSettings[key];
    if (setting) {
      updateMutation.mutate({
        key,
        value: setting.value,
        type: setting.type,
        category: setting.category,
        description: setting.description,
      });
      setEditingSettings({
        ...editingSettings,
        [key]: null,
      });
    }
  };

  const handleCancel = (key) => {
    setEditingSettings({
      ...editingSettings,
      [key]: null,
    });
  };

  const handleValueChange = (key, value) => {
    setEditingSettings({
      ...editingSettings,
      [key]: {
        ...editingSettings[key],
        value,
      },
    });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'website', label: 'Website', icon: Globe },
    { id: 'ads', label: 'Ads', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-settings'] })}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Personal Preferences */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-blue-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium text-gray-900">Sound Notifications</p>
              <p className="text-sm text-gray-700">Play sounds for new orders and other actions</p>
            </div>
          </div>
          <button
            onClick={handleSoundToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              soundEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4">
          {settings?.length > 0 ? (
            <div className="space-y-4">
              {settings.map((setting) => {
                const isEditing = editingSettings[setting.key];
                return (
                  <div key={setting.key} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{setting.key}</h3>
                        {setting.description && (
                          <p className="text-sm text-gray-700 mt-1">{setting.description}</p>
                        )}
                      </div>
                      <div className="ml-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleSave(setting.key)}
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </Button>
                            <Button
                              onClick={() => handleCancel(setting.key)}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleEdit(setting)}
                            variant="outline"
                            size="sm"
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      {isEditing ? (
                        <div className="max-w-md">
                          {setting.type === 'boolean' ? (
                            <div className="flex items-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isEditing.value === 'true' || isEditing.value === true}
                                  onChange={(e) => handleValueChange(setting.key, e.target.checked.toString())}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                <span className="ml-3 text-sm font-medium text-gray-700">
                                  {isEditing.value === 'true' || isEditing.value === true ? 'Enabled' : 'Disabled'}
                                </span>
                              </label>
                            </div>
                          ) : setting.key === 'site.language' ? (
                            <select
                              value={isEditing.value}
                              onChange={(e) => handleValueChange(setting.key, e.target.value)}
                              className="input w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="en">English</option>
                              <option value="ta">தமிழ் (Tamil)</option>
                              <option value="hi">हिन्दी (Hindi)</option>
                            </select>
                          ) : setting.key.includes('ads.placement') && setting.key.includes('enabled') ? (
                            <div className="flex items-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isEditing.value === 'true' || isEditing.value === true}
                                  onChange={(e) => handleValueChange(setting.key, e.target.checked.toString())}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                <span className="ml-3 text-sm font-medium text-gray-700">
                                  {isEditing.value === 'true' || isEditing.value === true ? 'Enabled' : 'Disabled'}
                                </span>
                              </label>
                            </div>
                          ) : setting.type === 'number' ? (
                            <input
                              type="number"
                              value={isEditing.value}
                              onChange={(e) => handleValueChange(setting.key, e.target.value)}
                              className="input w-full"
                            />
                          ) : setting.type === 'json' ? (
                            <textarea
                              value={isEditing.value}
                              onChange={(e) => handleValueChange(setting.key, e.target.value)}
                              className="input w-full h-24"
                              rows={4}
                              placeholder="Enter JSON configuration..."
                            />
                          ) : setting.type === 'url' ? (
                            <input
                              type="url"
                              value={isEditing.value}
                              onChange={(e) => handleValueChange(setting.key, e.target.value)}
                              className="input w-full"
                              placeholder="https://example.com"
                            />
                          ) : setting.type === 'email' ? (
                            <input
                              type="email"
                              value={isEditing.value}
                              onChange={(e) => handleValueChange(setting.key, e.target.value)}
                              className="input w-full"
                              placeholder="admin@example.com"
                            />
                          ) : (
                            <input
                              type="text"
                              value={isEditing.value}
                              onChange={(e) => handleValueChange(setting.key, e.target.value)}
                              className="input w-full"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="max-w-md">
                          {setting.type === 'boolean' ? (
                            <span
                              className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                setting.value === 'true' || setting.value === true
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-gray-900'
                              }`}
                            >
                              {setting.value === 'true' || setting.value === true ? 'Enabled' : 'Disabled'}
                            </span>
                          ) : setting.key === 'site.language' ? (
                            <p className="text-sm text-gray-900">
                              {setting.value === 'en' && 'English'}
                              {setting.value === 'ta' && 'தமிழ் (Tamil)'}
                              {setting.value === 'hi' && 'हिन्दी (Hindi)'}
                              {!['en', 'ta', 'hi'].includes(setting.value) && setting.value}
                            </p>
                          ) : setting.key.includes('ads.placement') && setting.key.includes('enabled') && !isEditing ? (
                            <span
                              className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                setting.value === 'true' || setting.value === true
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-gray-900'
                              }`}
                            >
                              {setting.value === 'true' || setting.value === true ? 'Enabled' : 'Disabled'}
                            </span>
                          ) : setting.key.includes('ads.placement') && setting.key.includes('enabled') && isEditing ? (
                            <select
                              value={isEditing.value}
                              onChange={(e) => handleValueChange(setting.key, e.target.value)}
                              className="input w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="true">Enabled</option>
                              <option value="false">Disabled</option>
                            </select>
                          ) : setting.key.includes('ads.placement') && setting.key.includes('fallback') ? (
                            <textarea
                              value={isEditing.value}
                              onChange={(e) => handleValueChange(setting.key, e.target.value)}
                              className="input w-full h-20"
                              rows={3}
                              placeholder="Enter fallback content (JSON format)..."
                            />
                          ) : setting.key.includes('ads.placement') && setting.key.includes('priority') && !isEditing ? (
                            <span
                              className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                setting.value === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : setting.value === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {setting.value ? setting.value.charAt(0).toUpperCase() + setting.value.slice(1) : 'Low'}
                            </span>
                          ) : setting.key.includes('ads.placement') && setting.key.includes('priority') && isEditing ? (
                            <select
                              value={isEditing.value}
                              onChange={(e) => handleValueChange(setting.key, e.target.value)}
                              className="input w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          ) : setting.key.includes('ads.placement') && setting.key.includes('campaigns') && !isEditing ? (
                            <div className="text-sm text-gray-700 bg-blue-100 p-2 rounded">
                              {setting.value || 'No campaigns assigned'}
                            </div>
                          ) : setting.key.includes('ads.placement') && setting.key.includes('campaigns') && isEditing ? (
                            <textarea
                              value={isEditing.value}
                              onChange={(e) => handleValueChange(setting.key, e.target.value)}
                              className="input w-full h-20"
                              rows={3}
                              placeholder="Enter campaign IDs (comma-separated)..."
                            />
                          ) : setting.key.includes('ads.placement') && setting.key.includes('fallback') && !isEditing ? (
                            <pre className="text-sm text-gray-700 bg-blue-100 p-2 rounded whitespace-pre-wrap">
                              {JSON.stringify(JSON.parse(setting.value || '{}'), null, 2)}
                            </pre>
                          ) : setting.key.includes('ads.placement') && setting.key.includes('fallback') && isEditing ? (
                            <textarea
                              value={isEditing.value}
                              onChange={(e) => handleValueChange(setting.key, e.target.value)}
                              className="input w-full h-20"
                              rows={3}
                              placeholder="Enter fallback content (JSON format)..."
                            />
                          ) : setting.type === 'json' ? (
                            <pre className="text-sm text-gray-700 bg-blue-100 p-2 rounded">
                              {JSON.stringify(JSON.parse(setting.value || '{}'), null, 2)}
                            </pre>
                          ) : (
                            <p className="text-sm text-gray-900">{setting.value}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No settings found for this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;