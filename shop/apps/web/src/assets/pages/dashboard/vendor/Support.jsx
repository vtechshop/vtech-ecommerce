// FILE: apps/web/src/pages/dashboard/vendor/Support.jsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import {
  MessageSquare, Plus, Send, Paperclip, X, Search, Filter, Clock,
  CheckCircle, MessageCircle, ChevronRight, ChevronDown,
  HelpCircle, Phone, Mail, FileText, Loader2, Bell, ExternalLink,
  ArrowRight, Ticket, CircleDot, XCircle, RefreshCw
} from 'lucide-react';
import { formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, subValue, color, onClick, active }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'text-blue-600 bg-blue-50', border: 'border-blue-500 ring-blue-200' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', badge: 'text-yellow-600 bg-yellow-50', border: 'border-yellow-500 ring-yellow-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', badge: 'text-green-600 bg-green-50', border: 'border-green-500 ring-green-200' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600', badge: 'text-gray-600 bg-gray-50', border: 'border-gray-500 ring-gray-200' },
  };
  const classes = colorClasses[color] || colorClasses.blue;

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-lg border-2 p-3 sm:p-4 text-left transition-all hover:shadow-md w-full ${
        active ? `${classes.border} ring-2` : 'border-gray-200'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${classes.bg}`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${classes.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{label}</p>
        </div>
        {subValue && (
          <span className={`text-[10px] sm:text-xs font-medium ${classes.badge} px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full`}>
            {subValue}
          </span>
        )}
      </div>
    </button>
  );
};

// Ticket Card Component for Mobile
const TicketCard = ({ ticket, onView, getStatusBadge, getPriorityBadge, getResponseBadge }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{ticket.subject}</h3>
        <p className="text-xs text-gray-500 mt-1">#{ticket.ticketId}</p>
      </div>
      {getResponseBadge(ticket)}
    </div>

    <div className="flex items-center gap-2 flex-wrap mb-3">
      {getStatusBadge(ticket.status)}
      {getPriorityBadge(ticket.priority)}
      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded capitalize">
        {ticket.category}
      </span>
    </div>

    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
      {ticket.description}
    </p>

    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        {formatDate(ticket.createdAt)}
      </div>
      <div className="flex items-center gap-2">
        {ticket.messages?.length > 0 && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {ticket.messages.length}
          </span>
        )}
        <button
          onClick={() => onView(ticket._id)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
        >
          View <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

const Support = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'other',
    priority: 'medium',
  });
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Fetch tickets
  const { data: ticketsData, isLoading, refetch } = useQuery({
    queryKey: ['vendor-tickets'],
    queryFn: async () => {
      const response = await api.get('/tickets');
      return response.data;
    },
  });

  // Fetch ticket stats
  const { data: statsData } = useQuery({
    queryKey: ['vendor-ticket-stats'],
    queryFn: async () => {
      const response = await api.get('/tickets/my-stats');
      return response.data.data;
    },
  });

  // Fetch single ticket
  const { data: ticketDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['ticket', selectedTicket],
    queryFn: async () => {
      const response = await api.get(`/tickets/${selectedTicket}`);
      return response.data.data;
    },
    enabled: !!selectedTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-ticket-stats'] });
    },
  });

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/tickets', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-ticket-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['ticket', selectedTicket] });
      queryClient.invalidateQueries({ queryKey: ['vendor-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-ticket-stats'] });
      setNewMessage('');
      toast.success('Message sent!');
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
      const formDataObj = new FormData();
      files.forEach((file) => formDataObj.append('files', file));

      const response = await api.post('/upload/multiple', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrls = response.data.data.map((file) => file.url);
      setAttachments((prev) => [...prev, ...uploadedUrls]);
      toast.success(`${files.length} file(s) uploaded!`);
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

  // Filter tickets
  const filteredTickets = useMemo(() => {
    let tickets = ticketsData?.data || [];

    if (statusFilter !== 'all') {
      tickets = tickets.filter(t => t.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      tickets = tickets.filter(t => t.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tickets = tickets.filter(t =>
        t.subject.toLowerCase().includes(query) ||
        t.ticketId.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    return tickets;
  }, [ticketsData, statusFilter, categoryFilter, searchQuery]);

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-blue-100 text-blue-700 border-blue-200',
      in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      resolved: 'bg-green-100 text-green-700 border-green-200',
      closed: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    const icons = {
      open: CircleDot,
      in_progress: Clock,
      resolved: CheckCircle,
      closed: XCircle,
    };
    const Icon = icons[status] || CircleDot;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600',
    };
    return (
      <span className={`text-xs font-medium ${styles[priority]}`}>
        {priority === 'urgent' && '🔴 '}
        {priority === 'high' && '🟠 '}
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const getResponseBadge = (ticket) => {
    if (ticket.status === 'closed' || ticket.status === 'resolved') return null;

    if (ticket.lastResponseBy === 'admin' && !ticket.userViewed) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 animate-pulse">
          <Bell className="w-3 h-3" /> New Reply
        </span>
      );
    }

    if (ticket.lastResponseBy === 'user' && !ticket.adminViewed) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
          <Clock className="w-3 h-3" /> Awaiting
        </span>
      );
    }

    return null;
  };

  const stats = statsData || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, unread: 0 };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const tickets = ticketsData?.data || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-600 text-sm mt-1">Get help from our support team</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            <span>New Ticket</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          icon={Ticket}
          label="Total Tickets"
          value={stats.total}
          color="blue"
          onClick={() => setStatusFilter('all')}
          active={statusFilter === 'all'}
        />
        <StatsCard
          icon={CircleDot}
          label="Open"
          value={stats.open}
          subValue={stats.unread > 0 ? `${stats.unread} new` : null}
          color="blue"
          onClick={() => setStatusFilter('open')}
          active={statusFilter === 'open'}
        />
        <StatsCard
          icon={Clock}
          label="In Progress"
          value={stats.inProgress}
          color="yellow"
          onClick={() => setStatusFilter('in_progress')}
          active={statusFilter === 'in_progress'}
        />
        <StatsCard
          icon={CheckCircle}
          label="Resolved"
          value={stats.resolved}
          color="green"
          onClick={() => setStatusFilter('resolved')}
          active={statusFilter === 'resolved'}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Filter Toggle (Mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Status Filter Tabs (Desktop) */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  statusFilter === status
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="hidden sm:block px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="order">Order</option>
            <option value="payment">Payment</option>
            <option value="product">Product</option>
            <option value="shipping">Shipping</option>
            <option value="return">Return</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="sm:hidden mt-3 pt-3 border-t border-gray-200 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Categories</option>
                <option value="order">Order</option>
                <option value="payment">Payment</option>
                <option value="product">Product</option>
                <option value="shipping">Shipping</option>
                <option value="return">Return</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Support Tickets</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            You haven't created any support tickets yet. Need help? Create a ticket and our team will assist you.
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Your First Ticket
          </Button>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tickets Found</h3>
          <p className="text-gray-600">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <>
          {/* Mobile View - Cards */}
          <div className="sm:hidden space-y-3">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                onView={setSelectedTicket}
                getStatusBadge={getStatusBadge}
                getPriorityBadge={getPriorityBadge}
                getResponseBadge={getResponseBadge}
              />
            ))}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden sm:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Ticket</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Updated</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate max-w-xs">{ticket.subject}</p>
                              {getResponseBadge(ticket)}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">#{ticket.ticketId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600 capitalize">{ticket.category}</span>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(ticket.status)}
                      </td>
                      <td className="px-4 py-4">
                        {getPriorityBadge(ticket.priority)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-600">
                          {formatDate(ticket.updatedAt)}
                        </div>
                        {ticket.messages?.length > 0 && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <MessageCircle className="w-3 h-3" />
                            {ticket.messages.length} {ticket.messages.length === 1 ? 'reply' : 'replies'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setSelectedTicket(ticket._id)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          View <ArrowRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Quick Help Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              Need Quick Help?
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Contact our support team for immediate assistance
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:support@vtech.com"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden xs:inline">Email Support</span>
              <span className="xs:hidden">Email</span>
            </a>
            <a
              href="tel:+911234567890"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden xs:inline">Call Us</span>
              <span className="xs:hidden">Call</span>
            </a>
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create Support Ticket</h2>
                <p className="text-sm text-gray-600 mt-1">Describe your issue and we'll get back to you</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="order">Order Issue</option>
                    <option value="payment">Payment</option>
                    <option value="product">Product</option>
                    <option value="shipping">Shipping</option>
                    <option value="return">Return/Refund</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low - General inquiry</option>
                    <option value="medium">Medium - Need help soon</option>
                    <option value="high">High - Urgent issue</option>
                    <option value="urgent">Urgent - Critical problem</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Please describe your issue in detail. Include any relevant order IDs, product names, or error messages."
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments <span className="text-gray-400">(Optional)</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                  <div className="flex flex-col items-center justify-center text-center">
                    <label className="flex flex-col items-center gap-2 cursor-pointer">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        {uploading ? (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : (
                          <Paperclip className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        {uploading ? 'Uploading...' : 'Click to upload files'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Images, PDF, DOC up to 10MB each
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

                  {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachments.map((url, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700 truncate">
                              {url.split('/').pop()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="flex-1 sm:flex-none">
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Ticket'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white p-4 sm:p-6 border-b border-gray-200 flex items-start justify-between z-10">
              <div className="flex-1 min-w-0 pr-4">
                {loadingDetail ? (
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                      {ticketDetail?.subject}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">#{ticketDetail?.ticketId}</p>
                  </>
                )}
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <Spinner size="lg" />
              </div>
            ) : ticketDetail ? (
              <>
                {/* Ticket Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {/* Status Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(ticketDetail.status)}
                    {getPriorityBadge(ticketDetail.priority)}
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded capitalize">
                      {ticketDetail.category}
                    </span>
                    {ticketDetail.assignedTo && (
                      <span className="text-xs text-gray-500">
                        Assigned to: {ticketDetail.assignedTo.name}
                      </span>
                    )}
                  </div>

                  {/* Original Request */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-600 uppercase">Your Request</span>
                      <span className="text-xs text-gray-400">
                        {formatDate(ticketDetail.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{ticketDetail.description}</p>
                    {ticketDetail.attachments?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ticketDetail.attachments.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
                          >
                            <Paperclip className="w-3 h-3" />
                            {url.split('/').pop()}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  {ticketDetail.messages?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-700 uppercase">Conversation</h4>
                      {ticketDetail.messages.map((msg, index) => {
                        const isAdmin = msg.sender?.role === 'admin';
                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-lg ${
                              isAdmin
                                ? 'bg-blue-50 border border-blue-200 ml-0 sm:ml-4'
                                : 'bg-white border border-gray-200 mr-0 sm:mr-4'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                  isAdmin ? 'bg-blue-600' : 'bg-gray-600'
                                }`}>
                                  {(msg.sender?.name || 'U')[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">
                                    {msg.sender?.name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {isAdmin ? 'Support Team' : 'You'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs text-gray-500">{formatDate(msg.timestamp)}</span>
                            </div>
                            <p className="text-gray-800 whitespace-pre-wrap text-sm">{msg.message}</p>
                            {msg.attachments?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {msg.attachments.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    {url.split('/').pop()}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {ticketDetail.status !== 'closed' && (
                  <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50">
                    <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row gap-3">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={2}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                        placeholder="Type your reply..."
                      />
                      <Button
                        type="submit"
                        disabled={!newMessage.trim() || addMessageMutation.isPending}
                        className="sm:self-end flex items-center justify-center gap-2"
                      >
                        {addMessageMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span className="sm:hidden">Send Reply</span>
                      </Button>
                    </form>
                  </div>
                )}

                {ticketDetail.status === 'closed' && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 text-center">
                    <p className="text-sm text-gray-600">
                      This ticket has been closed. Create a new ticket if you need further assistance.
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
