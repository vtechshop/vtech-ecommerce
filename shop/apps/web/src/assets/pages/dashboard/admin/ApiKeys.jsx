// FILE: apps/web/src/pages/dashboard/admin/ApiKeys.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, AlertCircle, CheckCircle2, Code2, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ApiKeys = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDesc, setNewKeyDesc] = useState('');
  const [revealedKey, setRevealedKey] = useState(null); // { id, key }
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['admin-api-keys'],
    queryFn: async () => {
      const res = await api.get('/user/api-keys');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, description }) => {
      const res = await api.post('/user/api-keys', { name, description, permissions: ['read', 'write'] });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['admin-api-keys']);
      setRevealedKey({ id: data.id, key: data.key });
      setShowCreate(false);
      setNewKeyName('');
      setNewKeyDesc('');
      toast.success('API key created — save it now, it won\'t be shown again');
    },
    onError: () => toast.error('Failed to create API key'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/user/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-api-keys']);
      setDeleteConfirm(null);
      toast.success('API key deleted');
    },
    onError: () => toast.error('Failed to delete API key'),
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard'));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    createMutation.mutate({ name: newKeyName.trim(), description: newKeyDesc.trim() });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-6 h-6" /> API Keys
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate API keys to access vtechkitchen.com API from external software
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New API Key
        </button>
      </div>

      {/* Usage info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p className="font-semibold">How to use in your GST billing software</p>
            <p>Add this header to every API request:</p>
            <code className="block bg-blue-100 dark:bg-blue-900/50 rounded px-3 py-2 font-mono text-xs mt-2">
              Authorization: Bearer vt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
            </code>
            <p className="mt-2">Base URL: <span className="font-mono font-semibold">https://api.vtechkitchen.com/api</span></p>
            <p>Useful endpoints:</p>
            <ul className="list-disc ml-4 space-y-0.5 font-mono text-xs">
              <li>GET /catalog/products — list products</li>
              <li>GET /catalog/products/:slug — product detail</li>
              <li>GET /orders — list orders</li>
              <li>GET /orders/:id — order detail</li>
            </ul>
          </div>
        </div>
      </div>

      {/* One-time key reveal */}
      {revealedKey && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                API key created — copy it now! It will not be shown again.
              </p>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-lg px-3 py-2">
                <code className="text-xs font-mono text-gray-800 dark:text-gray-200 flex-1 break-all">
                  {revealedKey.key}
                </code>
                <button
                  onClick={() => copyToClipboard(revealedKey.key)}
                  className="flex-shrink-0 p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                  title="Copy"
                >
                  <Copy className="w-4 h-4 text-green-600 dark:text-green-400" />
                </button>
              </div>
            </div>
            <button onClick={() => setRevealedKey(null)} className="text-green-500 hover:text-green-700 dark:hover:text-green-300">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Create new API key</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. GST Billing Software"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newKeyDesc}
                onChange={(e) => setNewKeyDesc(e.target.value)}
                placeholder="Optional — what is this key used for?"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={createMutation.isPending || !newKeyName.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {createMutation.isPending ? 'Creating…' : 'Create key'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewKeyName(''); setNewKeyDesc(''); }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keys list */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No API keys yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline"
            >
              Create your first key
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {keys.map((k) => (
              <div key={k._id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{k.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      k.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {k.status}
                    </span>
                  </div>
                  {k.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{k.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                      {k.prefix}_••••••••••••••••••••••••••••••••••••••••
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Created {new Date(k.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    {k.lastUsedAt && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        Last used {new Date(k.lastUsedAt).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {deleteConfirm === k._id ? (
                    <>
                      <span className="text-xs text-red-600 dark:text-red-400">Delete this key?</span>
                      <button
                        onClick={() => deleteMutation.mutate(k._id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(k._id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Delete key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeys;
