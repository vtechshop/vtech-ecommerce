// FILE: apps/web/src/pages/dashboard/admin/Settings.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import {
  Save, RefreshCw, Globe, Mail, CreditCard, Shield, Bell, Volume2, VolumeX,
  Settings as SettingsIcon, Search, Download, Upload, X, Check, AlertCircle,
  Eye, EyeOff, Copy, Megaphone, Layers, Truck, Code, Wrench, Zap, Database,
  ChevronDown, ChevronRight, Edit3, RotateCcw, FileJson, Clock, Info
} from 'lucide-react';
import { getSoundEnabled, toggleSound, playClick } from '@/utils/sounds';
import { toast } from 'react-hot-toast';

const Settings = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [editingSettings, setEditingSettings] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [showHistory, setShowHistory] = useState(null);

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

  // Fetch settings stats
  const { data: stats } = useQuery({
    queryKey: ['settings-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/settings/stats');
      return response.data.data;
    },
  });

  const { data: settings, isLoading, refetch } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ['settings-stats'] });
      toast.success('Setting updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update setting');
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (settingsData) => {
      await api.post('/admin/settings/bulk-update', { settings: settingsData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings-stats'] });
      toast.success('Settings imported successfully');
      setShowImportModal(false);
      setImportData('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to import settings');
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

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/settings/export');
      const dataStr = JSON.stringify(response.data.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `settings-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Settings exported successfully');
    } catch (error) {
      toast.error('Failed to export settings');
    }
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importData);
      if (Array.isArray(parsed)) {
        bulkUpdateMutation.mutate(parsed);
      } else {
        toast.error('Invalid format. Expected an array of settings.');
      }
    } catch (e) {
      toast.error('Invalid JSON format');
    }
  };

  const copyToClipboard = (value) => {
    navigator.clipboard.writeText(String(value));
    toast.success('Copied to clipboard');
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe, description: 'Site name, timezone, language' },
    { id: 'website', label: 'Website', icon: Layers, description: 'Homepage, header, footer' },
    { id: 'ads', label: 'Ads', icon: Megaphone, description: 'Ad placements and campaigns' },
    { id: 'email', label: 'Email', icon: Mail, description: 'SMTP and email templates' },
    { id: 'payment', label: 'Payment', icon: CreditCard, description: 'Payment gateways' },
    { id: 'shipping', label: 'Shipping', icon: Truck, description: 'Shipping methods and rates' },
    { id: 'security', label: 'Security', icon: Shield, description: '2FA, sessions, rate limits' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Push and alerts' },
    { id: 'features', label: 'Features', icon: Zap, description: 'Feature flags' },
    { id: 'integrations', label: 'Integrations', icon: Code, description: 'Third-party services' },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, description: 'Maintenance mode' },
  ];

  // Group settings by prefix (e.g., site.name, site.currency -> group "site")
  const groupSettings = (settingsList) => {
    if (!settingsList) return {};

    const groups = {};
    settingsList.forEach(setting => {
      const parts = setting.key.split('.');
      const groupName = parts.length > 1 ? parts[0] : 'other';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(setting);
    });
    return groups;
  };

  // Filter settings based on search
  const filteredSettings = settings?.filter(setting =>
    setting.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    setting.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(setting.value).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedSettings = groupSettings(filteredSettings);

  const getSettingIcon = (key) => {
    if (key.includes('email')) return Mail;
    if (key.includes('currency') || key.includes('payment')) return CreditCard;
    if (key.includes('security') || key.includes('password')) return Shield;
    if (key.includes('notification') || key.includes('alert')) return Bell;
    if (key.includes('shipping')) return Truck;
    if (key.includes('api') || key.includes('integration')) return Code;
    return SettingsIcon;
  };

  const renderSettingValue = (setting, isEditing) => {
    const editValue = editingSettings[setting.key]?.value;

    if (isEditing) {
      // Edit mode
      if (setting.type === 'boolean' || setting.key.includes('enabled')) {
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleValueChange(setting.key, 'true')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                editValue === 'true' || editValue === true
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Enabled
            </button>
            <button
              onClick={() => handleValueChange(setting.key, 'false')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                editValue === 'false' || editValue === false
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Disabled
            </button>
          </div>
        );
      }

      if (setting.key === 'site.language') {
        return (
          <select
            value={editValue}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="en">English</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
        );
      }

      if (setting.key.includes('priority')) {
        return (
          <select
            value={editValue}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        );
      }

      if (setting.type === 'number') {
        return (
          <input
            type="number"
            value={editValue}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
      }

      if (setting.type === 'json' || setting.key.includes('config') || setting.key.includes('fallback')) {
        return (
          <textarea
            value={typeof editValue === 'object' ? JSON.stringify(editValue, null, 2) : editValue}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            rows={5}
            className="w-full max-w-lg px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Enter JSON configuration..."
          />
        );
      }

      if (setting.key.includes('secret') || setting.key.includes('password') || setting.key.includes('api_key')) {
        return (
          <div className="relative max-w-md">
            <input
              type="password"
              value={editValue}
              onChange={(e) => handleValueChange(setting.key, e.target.value)}
              className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );
      }

      if (setting.type === 'url' || setting.key.includes('url')) {
        return (
          <input
            type="url"
            value={editValue}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            className="w-full max-w-lg px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com"
          />
        );
      }

      if (setting.type === 'email' || setting.key.includes('email')) {
        return (
          <input
            type="email"
            value={editValue}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="admin@example.com"
          />
        );
      }

      // Default text input
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => handleValueChange(setting.key, e.target.value)}
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      );
    }

    // Display mode
    if (setting.type === 'boolean' || setting.key.includes('enabled')) {
      const isEnabled = setting.value === 'true' || setting.value === true;
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
          isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {isEnabled ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          {isEnabled ? 'Enabled' : 'Disabled'}
        </span>
      );
    }

    if (setting.key === 'site.language') {
      const languages = { en: 'English', ta: 'தமிழ் (Tamil)', hi: 'हिन्दी (Hindi)' };
      return <span className="text-gray-900">{languages[setting.value] || setting.value}</span>;
    }

    if (setting.key.includes('priority')) {
      const colors = {
        high: 'bg-red-100 text-red-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-green-100 text-green-800',
      };
      return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[setting.value] || 'bg-gray-100 text-gray-800'}`}>
          {setting.value ? setting.value.charAt(0).toUpperCase() + setting.value.slice(1) : 'N/A'}
        </span>
      );
    }

    if (setting.key.includes('secret') || setting.key.includes('password') || setting.key.includes('api_key')) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-mono">{'•'.repeat(12)}</span>
          <button
            onClick={() => copyToClipboard(setting.value)}
            className="text-gray-400 hover:text-gray-600"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      );
    }

    if (setting.type === 'json') {
      try {
        const jsonValue = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        return (
          <pre className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg overflow-x-auto max-w-lg font-mono">
            {JSON.stringify(jsonValue, null, 2)}
          </pre>
        );
      } catch {
        return <span className="text-gray-900">{String(setting.value)}</span>;
      }
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-900">{String(setting.value)}</span>
        <button
          onClick={() => copyToClipboard(setting.value)}
          className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    );
  };

  if (isLoading && !settings) {
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-700 mt-2">Configure your platform settings and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Settings Overview Card - Dark Gradient */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-bold">Settings Overview</h2>
            <p className="text-gray-300 text-sm">Platform configuration at a glance</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {stats ? (
            <>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.total || 0}</div>
                <div className="text-gray-300 text-sm">Total Settings</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.categories || 0}</div>
                <div className="text-gray-300 text-sm">Categories</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.public || 0}</div>
                <div className="text-gray-300 text-sm">Public</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.private || 0}</div>
                <div className="text-gray-300 text-sm">Private</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.recentlyUpdated || 0}</div>
                <div className="text-gray-300 text-sm">Updated Today</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.featuresEnabled || 0}</div>
                <div className="text-gray-300 text-sm">Features On</div>
              </div>
            </>
          ) : (
            <div className="col-span-6 text-center text-gray-300">Loading stats...</div>
          )}
        </div>
      </div>

      {/* Sound Preferences Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {soundEnabled ? (
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-blue-600" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <VolumeX className="w-5 h-5 text-gray-400" />
              </div>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchTerm('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search settings by key, value, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tab Description */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            {tabs.find(t => t.id === activeTab)?.description}
            <span className="text-gray-400 ml-2">
              ({filteredSettings?.length || 0} settings)
            </span>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {Object.keys(groupedSettings).length > 0 ? (
          <div className="divide-y divide-gray-200">
            {Object.entries(groupedSettings).map(([groupName, groupSettings]) => (
              <div key={groupName}>
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between px-6 py-3 bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5" />
                    <span className="font-medium capitalize">{groupName}</span>
                    <span className="text-gray-400 text-sm">({groupSettings.length})</span>
                  </div>
                  {expandedGroups[groupName] === false ? (
                    <ChevronRight className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>

                {/* Group Settings */}
                {expandedGroups[groupName] !== false && (
                  <div className="divide-y divide-gray-100">
                    {groupSettings.map((setting) => {
                      const isEditing = editingSettings[setting.key];
                      const SettingIcon = getSettingIcon(setting.key);

                      return (
                        <div
                          key={setting.key}
                          className="group px-6 py-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <SettingIcon className="w-4 h-4 text-gray-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-medium text-gray-900">{setting.key}</h3>
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                    {setting.type}
                                  </span>
                                  {setting.isPublic && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                                      <Eye className="w-3 h-3" />
                                      Public
                                    </span>
                                  )}
                                </div>
                                {setting.description && (
                                  <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
                                )}
                                <div className="mt-3">
                                  {renderSettingValue(setting, isEditing)}
                                </div>
                                {setting.updatedAt && (
                                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                                    <Clock className="w-3 h-3" />
                                    Updated {new Date(setting.updatedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSave(setting.key)}
                                    disabled={updateMutation.isPending}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                  >
                                    <Save className="w-4 h-4" />
                                    Save
                                  </button>
                                  <button
                                    onClick={() => handleCancel(setting.key)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                  >
                                    <X className="w-4 h-4" />
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleEdit(setting)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Edit
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <SettingsIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900">No settings found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm
                ? 'Try adjusting your search term'
                : 'No settings configured for this category yet'}
            </p>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <div className="text-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Import Settings
                </h2>
                <p className="text-gray-300 text-sm">Paste JSON settings data</p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData('');
                }}
                className="text-gray-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Warning</p>
                  <p>Importing settings will overwrite existing values. Make sure to export your current settings first.</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  JSON Settings Data
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder={`[
  {
    "key": "site.name",
    "value": "My Store",
    "type": "string",
    "category": "general"
  }
]`}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importData.trim() || bulkUpdateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileJson className="w-4 h-4" />
                  {bulkUpdateMutation.isPending ? 'Importing...' : 'Import Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
