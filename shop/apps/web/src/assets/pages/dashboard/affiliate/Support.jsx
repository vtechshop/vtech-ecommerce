// FILE: apps/web/src/pages/dashboard/affiliate/Support.jsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import {
  MessageSquare, Plus, Eye, Send, X, Search, Filter, Clock,
  CheckCircle, AlertCircle, XCircle, ChevronRight, ChevronDown,
  HelpCircle, Phone, Mail, FileText, Loader2, Bell, ExternalLink,
  ArrowRight, Ticket, CircleDot, MessageCircle, Sparkles, RefreshCw
} from 'lucide-react';
import { formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, subValue, color, onClick, active }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', border: 'border-blue-500 ring-blue-200' },
    yellow: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', border: 'border-amber-500 ring-amber-200' },
    green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', border: 'border-green-500 ring-green-200' },
    red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', border: 'border-red-500 ring-red-200' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', border: 'border-purple-500 ring-purple-200' },
  };

  const classes = colorClasses[color] || colorClasses.blue;

  return (
    <div
      onClick={onClick}
      className={`${classes.bg} rounded-xl border-2 p-3 sm:p-4 transition-all cursor-pointer hover:shadow-md ${
        active ? `${classes.border} ring-2` : 'border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${classes.icon} flex items-center justify-center`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs sm:text-sm text-gray-600">{label}</p>
          {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}
        </div>
      </div>
    </div>
  );
};

// Quick Help Card Component
const QuickHelpCard = ({ icon: Icon, title, description, color, onClick }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md cursor-pointer transition-all"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" />
      </div>
    </div>
  );
};

// Ticket Card Component
const TicketCard = ({ ticket, onView, getStatusBadge, getPriorityBadge, getResponseStatusBadge }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-all">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{ticket.subject}</h3>
          {getResponseStatusBadge(ticket)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {getStatusBadge(ticket.status)}
          {getPriorityBadge(ticket.priority)}
        </div>
      </div>
      <button
        onClick={() => onView(ticket._id)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
      >
        <Eye className="w-4 h-4" />
        <span className="hidden sm:inline">View</span>
      </button>
    </div>
    <p className="text-xs sm:text-sm text-gray-500 mb-3">
      <span className="font-medium">#{ticket.ticketId}</span>
      <span className="mx-2">•</span>
      {formatDate(ticket.createdAt)}
      {ticket.assignedTo && (
        <>
          <span className="mx-2">•</span>
          Assigned to: {ticket.assignedTo.name}
        </>
      )}
    </p>
    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg line-clamp-2">
      {ticket.description}
    </p>
    {ticket.messages && ticket.messages.length > 0 && (
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <MessageCircle className="w-4 h-4" />
        {ticket.messages.length} {ticket.messages.length === 1 ? 'reply' : 'replies'}
      </div>
    )}
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
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'other',
    priority: 'medium',
  });

  // Fetch ticket stats
  const { data: statsData } = useQuery({
    queryKey: ['affiliate-ticket-stats'],
    queryFn: async () => {
      const response = await api.get('/tickets/my-stats');
      return response.data.data;
    },
  });

  // Fetch tickets
  const { data: ticketsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['affiliate-tickets'],
    queryFn: async () => {
      const response = await api.get('/tickets');
      return response.data;
    },
  });

  // Fetch single ticket
  const { data: ticketDetail, isLoading: isLoadingDetail } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ['affiliate-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-ticket-stats'] });
      setShowCreateModal(false);
      setFormData({ subject: '', description: '', category: 'other', priority: 'medium' });
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
      queryClient.invalidateQueries({ queryKey: ['affiliate-tickets'] });
      setNewMessage('');
      toast.success('Message sent successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to send message');
    },
  });

  const handleCreateTicket = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    addMessageMutation.mutate({ ticketId: selectedTicket, message: newMessage });
  };

  const openCreateWithCategory = (category) => {
    setFormData({ ...formData, category });
    setShowCreateModal(true);
  };

  // Filter tickets
  const filteredTickets = useMemo(() => {
    let tickets = ticketsData?.data || [];

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        tickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
      } else {
        tickets = tickets.filter(t => t.status === statusFilter);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      tickets = tickets.filter(t =>
        t.subject.toLowerCase().includes(query) ||
        t.ticketId.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }

    return tickets;
  }, [ticketsData?.data, statusFilter, searchQuery]);

  const stats = statsData || {
    total: ticketsData?.data?.length || 0,
    open: ticketsData?.data?.filter(t => t.status === 'open').length || 0,
    inProgress: ticketsData?.data?.filter(t => t.status === 'in_progress').length || 0,
    resolved: ticketsData?.data?.filter(t => t.status === 'resolved').length || 0,
    closed: ticketsData?.data?.filter(t => t.status === 'closed').length || 0,
    active: ticketsData?.data?.filter(t => t.status === 'open' || t.status === 'in_progress').length || 0,
    unread: ticketsData?.data?.filter(t => t.lastResponseBy === 'admin' && !t.userViewed).length || 0,
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: { bg: 'bg-blue-100 text-blue-800', icon: CircleDot },
      in_progress: { bg: 'bg-amber-100 text-amber-800', icon: Clock },
      resolved: { bg: 'bg-green-100 text-green-800', icon: CheckCircle },
      closed: { bg: 'bg-gray-100 text-gray-800', icon: XCircle },
    };
    const style = styles[status] || styles.open;
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${style.bg}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getResponseStatusBadge = (ticket) => {
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      return null;
    }

    if (ticket.lastResponseBy === 'admin' && !ticket.userViewed) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 flex items-center gap-1">
          <Bell className="w-3 h-3" />
          New Response
        </span>
      );
    }

    if (ticket.lastResponseBy === 'user' && !ticket.adminViewed) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Awaiting
        </span>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600">Loading support tickets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              Support Center
            </h1>
            <p className="text-blue-100 text-sm mt-1">Get help with commissions, payments, and more</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>New Ticket</span>
          </button>
        </div>

        {/* Stats Summary */}
        {stats.unread > 0 && (
          <div className="mt-4 bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-3">
            <Bell className="w-5 h-5 text-yellow-300" />
            <span className="text-sm">
              You have <strong>{stats.unread}</strong> ticket{stats.unread > 1 ? 's' : ''} with new responses
            </span>
          </div>
        )}
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
          label="Active"
          value={stats.active}
          subValue={`${stats.open} open, ${stats.inProgress} in progress`}
          color="yellow"
          onClick={() => setStatusFilter('active')}
          active={statusFilter === 'active'}
        />
        <StatsCard
          icon={CheckCircle}
          label="Resolved"
          value={stats.resolved}
          color="green"
          onClick={() => setStatusFilter('resolved')}
          active={statusFilter === 'resolved'}
        />
        <StatsCard
          icon={XCircle}
          label="Closed"
          value={stats.closed}
          color="red"
          onClick={() => setStatusFilter('closed')}
          active={statusFilter === 'closed'}
        />
      </div>

      {/* Quick Help Links */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Quick Help Topics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickHelpCard
            icon={FileText}
            title="Commission Issues"
            description="Questions about earnings or payouts"
            color="blue"
            onClick={() => openCreateWithCategory('payment')}
          />
          <QuickHelpCard
            icon={Mail}
            title="Payment Support"
            description="Payment method or withdrawal help"
            color="green"
            onClick={() => openCreateWithCategory('payment')}
          />
          <QuickHelpCard
            icon={Sparkles}
            title="Marketing Materials"
            description="Request banners and promo content"
            color="purple"
            onClick={() => openCreateWithCategory('other')}
          />
          <QuickHelpCard
            icon={Phone}
            title="General Support"
            description="Other questions or issues"
            color="orange"
            onClick={() => openCreateWithCategory('other')}
          />
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets by subject, ID, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            {searchQuery || statusFilter !== 'all' ? 'No Tickets Found' : 'No Support Tickets'}
          </h3>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : "You haven't created any support tickets yet."}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button onClick={() => setShowCreateModal(true)}>Create Your First Ticket</Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' && ` (${statusFilter})`}
            </p>
          </div>
          <div className="grid gap-3">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                onView={setSelectedTicket}
                getStatusBadge={getStatusBadge}
                getPriorityBadge={getPriorityBadge}
                getResponseStatusBadge={getResponseStatusBadge}
              />
            ))}
          </div>
        </div>
      )}

      {/* Average Response Time Info */}
      {stats.avgResponseTime && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">Average Response Time</p>
              <p className="text-sm text-green-700">Our team typically responds within <strong>{stats.avgResponseTime}</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create Support Ticket</h2>
                <p className="text-sm text-gray-500 mt-1">We'll get back to you as soon as possible</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="payment">Payment & Commissions</option>
                    <option value="product">Product Questions</option>
                    <option value="technical">Technical Issue</option>
                    <option value="other">General Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low - General question</option>
                    <option value="medium">Medium - Need help soon</option>
                    <option value="high">High - Affecting my earnings</option>
                    <option value="urgent">Urgent - Critical issue</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  required
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Provide detailed information about your issue..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Tips for faster resolution:</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside text-blue-700">
                      <li>Include specific order IDs or commission details</li>
                      <li>Describe when the issue started</li>
                      <li>Mention any error messages you received</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : ticketDetail ? (
              <>
                <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{ticketDetail.subject}</h2>
                      <p className="text-sm text-gray-500 mt-1">Ticket ID: #{ticketDetail.ticketId}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Ticket Info */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(ticketDetail.status)}
                    {getPriorityBadge(ticketDetail.priority)}
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {ticketDetail.category}
                    </span>
                  </div>

                  {/* Original Description */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {ticketDetail.userId?.name?.charAt(0) || 'Y'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">You</p>
                        <p className="text-xs text-gray-500">{formatDate(ticketDetail.createdAt)}</p>
                      </div>
                    </div>
                    <p className="text-gray-900 text-sm sm:text-base">{ticketDetail.description}</p>
                  </div>

                  {/* Messages */}
                  {ticketDetail.messages && ticketDetail.messages.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Conversation ({ticketDetail.messages.length})
                      </h3>
                      <div className="space-y-3">
                        {ticketDetail.messages.map((msg, index) => {
                          const isAdmin = msg.sender?.role === 'admin' || msg.sender?.role === 'support';
                          return (
                            <div
                              key={index}
                              className={`p-4 rounded-xl ${
                                isAdmin
                                  ? 'bg-blue-50 border border-blue-200 ml-0 sm:ml-8'
                                  : 'bg-white border border-gray-200 mr-0 sm:mr-8'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isAdmin ? 'bg-blue-600' : 'bg-gray-200'
                                }`}>
                                  <span className={`text-sm font-medium ${
                                    isAdmin ? 'text-white' : 'text-gray-600'
                                  }`}>
                                    {msg.sender?.name?.charAt(0) || (isAdmin ? 'S' : 'Y')}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{msg.sender?.name || 'Unknown'}</p>
                                  <p className="text-xs text-gray-500">
                                    {isAdmin ? 'Support Team' : 'You'} • {formatDate(msg.timestamp)}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap">{msg.message}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reply Form */}
                  {ticketDetail.status !== 'closed' && ticketDetail.status !== 'resolved' && (
                    <form onSubmit={handleSendMessage} className="border-t border-gray-200 pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add a Reply
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          rows={3}
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Type your message..."
                        />
                        <Button
                          type="submit"
                          disabled={!newMessage.trim() || addMessageMutation.isPending}
                          className="sm:self-end"
                        >
                          {addMessageMutation.isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Closed/Resolved Notice */}
                  {(ticketDetail.status === 'closed' || ticketDetail.status === 'resolved') && (
                    <div className="bg-gray-100 rounded-xl p-4 text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="font-medium text-gray-900">This ticket has been {ticketDetail.status}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        If you need further assistance, please create a new ticket
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-900">Failed to load ticket details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
