// FILE: apps/web/src/pages/dashboard/vendor/Support.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { MessageSquare, Plus, Eye, Send, Paperclip, X } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';

const Support = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'other',
    priority: 'medium',
  });
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Fetch tickets
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['vendor-tickets'],
    queryFn: async () => {
      const response = await api.get('/tickets');
      return response.data;
    },
  });

  // Fetch single ticket
  const { data: ticketDetail } = useQuery({
    queryKey: ['ticket', selectedTicket],
    queryFn: async () => {
      const response = await api.get(`/tickets/${selectedTicket}`);
      return response.data.data;
    },
    enabled: !!selectedTicket,
  });

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/tickets', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendor-tickets']);
      setShowCreateModal(false);
      setFormData({ subject: '', description: '', category: 'other', priority: 'medium' });
      setAttachments([]);
      toast.success('Ticket created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create ticket');
    },
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const response = await api.post(`/tickets/${ticketId}/messages`, { message });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', selectedTicket]);
      queryClient.invalidateQueries(['vendor-tickets']);
      setNewMessage('');
      toast.success('Message sent successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to send message');
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await api.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrls = response.data.data.map((file) => file.url);
      setAttachments((prev) => [...prev, ...uploadedUrls]);
      toast.success(`${files.length} file(s) uploaded successfully!`);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTicket = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...formData, attachments });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    addMessageMutation.mutate({ ticketId: selectedTicket, message: newMessage });
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-900',
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-gray-100 text-gray-900',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getResponseStatusBadge = (ticket) => {
    // If ticket is closed or resolved, no status needed
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      return null;
    }

    // For vendor: Check if admin responded and if vendor viewed it
    if (ticket.lastResponseBy === 'admin' && !ticket.userViewed) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" />
          </svg>
          New Response
        </span>
      );
    }

    if (ticket.lastResponseBy === 'user' && !ticket.adminViewed) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Awaiting Admin
        </span>
      );
    }

    if (ticket.lastResponseBy === 'admin' && ticket.userViewed) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Responded
        </span>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const tickets = ticketsData?.data || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-700 mt-1">Contact admin for help and support</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Ticket
        </Button>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Support Tickets</h3>
          <p className="text-gray-700 mb-6">You haven't created any support tickets yet.</p>
          <Button onClick={() => setShowCreateModal(true)}>Create Your First Ticket</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900">{ticket.subject}</h3>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                    {getResponseStatusBadge(ticket)}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">Ticket ID: {ticket.ticketId}</p>
                  <p className="text-sm text-gray-500">
                    Created: {formatDate(ticket.createdAt)}
                    {ticket.assignedTo && ` • Assigned to: ${ticket.assignedTo.name}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTicket(ticket._id)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
              </div>
              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-100">
                {ticket.description.substring(0, 150)}
                {ticket.description.length > 150 && '...'}
              </div>
              {ticket.messages && ticket.messages.length > 0 && (
                <div className="mt-3 text-sm text-gray-500">
                  {ticket.messages.length} {ticket.messages.length === 1 ? 'reply' : 'replies'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Create Support Ticket</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  <option value="order">Order</option>
                  <option value="payment">Payment</option>
                  <option value="product">Product</option>
                  <option value="shipping">Shipping</option>
                  <option value="return">Return</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  required
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="Provide detailed information about your issue..."
                />
              </div>

              {/* File Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-center">
                    <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                      <Paperclip className="w-5 h-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {uploading ? 'Uploading...' : 'Choose Files'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Max 10 files. Supported: Images, PDF, DOC, TXT
                  </p>

                  {/* Attached Files List */}
                  {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachments.map((url, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded border border-gray-200"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">
                              {url.split('/').pop()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isLoading}>
                  {createMutation.isLoading ? 'Creating...' : 'Create Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Ticket Modal */}
      {selectedTicket && ticketDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{ticketDetail.subject}</h2>
                <p className="text-sm text-gray-500 mt-1">Ticket ID: {ticketDetail.ticketId}</p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Ticket Info */}
              <div className="flex items-center gap-3">
                {getStatusBadge(ticketDetail.status)}
                {getPriorityBadge(ticketDetail.priority)}
                <span className="text-sm text-gray-500">
                  Category: <span className="font-medium">{ticketDetail.category}</span>
                </span>
              </div>

              {/* Original Description */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Original Request:</p>
                <p className="text-gray-900">{ticketDetail.description}</p>
                {ticketDetail.attachments && ticketDetail.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Attachments:</p>
                    {ticketDetail.attachments.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-primary-800"
                      >
                        <Paperclip className="w-4 h-4" />
                        {url.split('/').pop()}
                      </a>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {formatDate(ticketDetail.createdAt)}
                </p>
              </div>

              {/* Messages */}
              {ticketDetail.messages && ticketDetail.messages.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Conversation</h3>
                  {ticketDetail.messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        msg.sender?.role === 'admin'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{msg.sender?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">
                            {msg.sender?.role === 'admin' ? 'Support Team' : 'You'}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(msg.timestamp)}</p>
                      </div>
                      <p className="text-gray-900">{msg.message}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-blue-600 hover:text-primary-800"
                            >
                              <Paperclip className="w-4 h-4" />
                              {url.split('/').pop()}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              {ticketDetail.status !== 'closed' && (
                <form onSubmit={handleSendMessage} className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add a Reply
                  </label>
                  <div className="flex gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="Type your message..."
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || addMessageMutation.isLoading}
                      className="h-fit"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
