// FILE: apps/web/src/pages/dashboard/admin/CRMTickets.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';
import {
  MessageSquare, Search, AlertCircle, CheckCircle, Clock, XCircle,
  Send, Paperclip, RefreshCw, Download, Inbox, Timer, AlertTriangle,
  User, Calendar, Tag, ChevronRight, Hourglass, Zap, TrendingUp,
  BarChart2, ArrowRight
} from 'lucide-react';
import NewBadge from '@/components/common/NewBadge';
import { getNewItemClasses, formatRelativeTime } from '@/utils/dateHelpers';

// SLA times by priority (in hours)
const SLA_TIMES = {
  urgent: 4,
  high: 24,
  medium: 48,
  low: 72,
};

// Calculate ticket age in hours
const getTicketAgeHours = (createdAt) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  return Math.floor(diffMs / (1000 * 60 * 60));
};

// Check if SLA is breached
const getSLAStatus = (createdAt, priority, status) => {
  if (status === 'resolved' || status === 'closed') {
    return { status: 'completed', label: 'Completed', color: 'text-green-600 bg-green-50' };
  }

  const ageHours = getTicketAgeHours(createdAt);
  const slaHours = SLA_TIMES[priority] || 48;
  const remaining = slaHours - ageHours;

  if (remaining < 0) {
    return { status: 'breached', label: 'SLA Breached', color: 'text-red-600 bg-red-50', icon: AlertTriangle };
  }
  if (remaining <= slaHours * 0.25) {
    return { status: 'critical', label: `${remaining}h left`, color: 'text-orange-600 bg-orange-50', icon: Hourglass };
  }
  return { status: 'ok', label: `${remaining}h left`, color: 'text-green-600 bg-green-50', icon: Timer };
};

// Ticket categories
const TICKET_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'order', label: 'Order Issues' },
  { value: 'refund', label: 'Refund Requests' },
  { value: 'product', label: 'Product Questions' },
  { value: 'account', label: 'Account Issues' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'feedback', label: 'Feedback/Complaints' },
  { value: 'other', label: 'Other' },
];

const CRMTickets = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingTicket, setViewingTicket] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['crm-tickets', page, statusFilter, priorityFilter, categoryFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/crm/tickets?${params}`);
      return response.data;
    },
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['crm-ticket-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/crm/tickets/stats');
      return response.data;
    },
  });

  const handleView = (ticket) => {
    setViewingTicket(ticket);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-200 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <Inbox className="w-3.5 h-3.5" />;
      case 'in-progress':
        return <Clock className="w-3.5 h-3.5" />;
      case 'resolved':
        return <CheckCircle className="w-3.5 h-3.5" />;
      case 'closed':
        return <XCircle className="w-3.5 h-3.5" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvData = [
      ['Ticket ID', 'Subject', 'Customer', 'Email', 'Priority', 'Status', 'Category', 'Age (hours)', 'Created', 'Updated'].join(','),
      ...(tickets || []).map(t => [
        t.ticketNumber || t._id.slice(-6),
        t.subject || 'N/A',
        t.customerId?.name || 'N/A',
        t.customerId?.email || 'N/A',
        t.priority || 'medium',
        t.status || 'open',
        t.category || 'general',
        getTicketAgeHours(t.createdAt),
        new Date(t.createdAt).toLocaleDateString(),
        new Date(t.updatedAt).toLocaleDateString(),
      ].map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `support-tickets-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const tickets = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);
  const stats = statsData?.data || {};

  // Calculate urgent/breached tickets
  const urgentTickets = tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed');
  const breachedTickets = tickets.filter(t => {
    const sla = getSLAStatus(t.createdAt, t.priority, t.status);
    return sla.status === 'breached';
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            Support Tickets
          </h1>
          <p className="text-gray-700 mt-1">Manage customer support requests</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              refetchStats();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total || 0}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <Inbox className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Open</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.open || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">In Progress</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.inProgress || 0}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Resolved</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolved || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Closed</p>
              <p className="text-3xl font-bold text-gray-600 mt-1">{stats.closed || 0}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Alert Card */}
      {(urgentTickets.length > 0 || breachedTickets.length > 0) && (
        <div className={`rounded-xl p-4 border ${breachedTickets.length > 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${breachedTickets.length > 0 ? 'bg-red-100' : 'bg-orange-100'}`}>
                <Zap className={`w-5 h-5 ${breachedTickets.length > 0 ? 'text-red-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <p className={`font-semibold ${breachedTickets.length > 0 ? 'text-red-800' : 'text-orange-800'}`}>
                  {breachedTickets.length > 0 ? `${breachedTickets.length} SLA Breached!` : `${urgentTickets.length} Urgent Tickets`}
                </p>
                <p className={`text-sm ${breachedTickets.length > 0 ? 'text-red-600' : 'text-orange-600'}`}>
                  {breachedTickets.length > 0 ? 'These tickets have exceeded their SLA time' : 'Requires immediate attention'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={breachedTickets.length > 0 ? 'danger' : 'warning'}
              onClick={() => {
                setStatusFilter('open');
                setPriorityFilter('urgent');
                setPage(1);
              }}
            >
              View Urgent
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-gray-600" />
            Performance Metrics
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime || '0h'}</p>
            <p className="text-xs text-gray-500">Avg Response Time</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.avgResolutionTime || '0h'}</p>
            <p className="text-xs text-gray-500">Avg Resolution Time</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.slaCompliance || '0'}%</p>
            <p className="text-xs text-gray-500">SLA Compliance</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{stats.csat || '0'}%</p>
            <p className="text-xs text-gray-500">Customer Satisfaction</p>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[
            { key: '', label: 'All', count: stats.total || 0 },
            { key: 'open', label: 'Open', count: stats.open || 0, icon: Inbox },
            { key: 'in-progress', label: 'In Progress', count: stats.inProgress || 0, icon: Clock },
            { key: 'resolved', label: 'Resolved', count: stats.resolved || 0, icon: CheckCircle },
            { key: 'closed', label: 'Closed', count: stats.closed || 0, icon: XCircle },
          ].map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setStatusFilter(key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === key
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {label}
              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                statusFilter === key ? 'bg-white/20' : 'bg-black/10'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Additional Filters */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
          <CustomSelect
            value={priorityFilter}
            onChange={(value) => {
              setPriorityFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Priorities' },
              { value: 'urgent', label: '🔴 Urgent' },
              { value: 'high', label: '🟠 High' },
              { value: 'medium', label: '🟡 Medium' },
              { value: 'low', label: '🟢 Low' },
            ]}
            placeholder="All Priorities"
            className="w-40"
          />
          <CustomSelect
            value={categoryFilter}
            onChange={(value) => {
              setCategoryFilter(value);
              setPage(1);
            }}
            options={TICKET_CATEGORIES}
            placeholder="All Categories"
            className="w-44"
          />
          {(searchTerm || priorityFilter || categoryFilter || statusFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setPriorityFilter('');
                setCategoryFilter('');
                setPage(1);
              }}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Ticket</th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Subject</th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Customer</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Priority</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">SLA</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Age</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg">No Tickets Found</p>
                    <p className="text-sm text-gray-400 mt-1">No support tickets match your filters.</p>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const slaStatus = getSLAStatus(ticket.createdAt, ticket.priority, ticket.status);
                  const ageHours = getTicketAgeHours(ticket.createdAt);

                  return (
                    <tr
                      key={ticket._id}
                      className={`transition-colors hover:bg-gray-50 ${
                        slaStatus.status === 'breached' ? 'bg-red-50/50' :
                        ticket.priority === 'urgent' ? 'bg-orange-50/30' :
                        getNewItemClasses(ticket.createdAt)
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            #{ticket.ticketNumber || ticket._id.slice(-6)}
                          </span>
                          <NewBadge createdAt={ticket.createdAt} />
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {formatRelativeTime(ticket.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 line-clamp-1">{ticket.subject}</p>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{ticket.message}</p>
                        {ticket.category && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Tag className="w-3 h-3" />
                            {ticket.category}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">
                              {ticket.customerId?.name?.charAt(0)?.toUpperCase() || 'C'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {ticket.customerId?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {ticket.customerId?.email || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(ticket.priority)}`}>
                          {getPriorityIcon(ticket.priority)}
                          {ticket.priority?.toUpperCase() || 'MEDIUM'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(ticket.status)}`}>
                          {getStatusIcon(ticket.status)}
                          {ticket.status?.replace('-', ' ').toUpperCase() || 'OPEN'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${slaStatus.color}`}>
                          {slaStatus.icon && <slaStatus.icon className="w-3 h-3" />}
                          {slaStatus.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-sm font-medium ${
                          ageHours > 72 ? 'text-red-600' : ageHours > 24 ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {ageHours}h
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleView(ticket)}
                          className="text-xs"
                        >
                          View
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Ticket Details Modal */}
      {viewingTicket && (
        <TicketDetailsModal
          ticket={viewingTicket}
          onClose={() => setViewingTicket(null)}
        />
      )}
    </div>
  );
};

// Ticket Details Modal Component
const TicketDetailsModal = ({ ticket, onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [reply, setReply] = useState('');
  const [newStatus, setNewStatus] = useState(ticket.status);
  const [newPriority, setNewPriority] = useState(ticket.priority);

  const slaStatus = getSLAStatus(ticket.createdAt, ticket.priority, ticket.status);
  const ageHours = getTicketAgeHours(ticket.createdAt);

  const updateStatusMutation = useMutation({
    mutationFn: async (status) => {
      await api.put(`/admin/crm/tickets/${ticket._id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['crm-ticket-stats'] });
      toast.success('Ticket status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (priority) => {
      await api.put(`/admin/crm/tickets/${ticket._id}/priority`, { priority });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tickets'] });
      toast.success('Ticket priority updated');
    },
    onError: () => {
      toast.error('Failed to update priority');
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (message) => {
      await api.post(`/admin/crm/tickets/${ticket._id}/reply`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tickets'] });
      setReply('');
      toast.success('Reply sent successfully');
    },
    onError: () => {
      toast.error('Failed to send reply');
    },
  });

  const handleSendReply = () => {
    if (!reply.trim()) return;
    replyMutation.mutate(reply);
  };

  const handleStatusChange = () => {
    if (newStatus !== ticket.status) {
      updateStatusMutation.mutate(newStatus);
    }
  };

  const handlePriorityChange = () => {
    if (newPriority !== ticket.priority) {
      updatePriorityMutation.mutate(newPriority);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold">
                  #{ticket.ticketNumber || ticket._id.slice(-6)}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${slaStatus.color}`}>
                  {slaStatus.label}
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1">{ticket.subject}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-blue-200" />
              <span className="text-blue-100">Age:</span>
              <span className="font-semibold">{ageHours}h</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-200" />
              <span className="text-blue-100">{ticket.customerId?.name || 'Customer'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-200" />
              <span className="text-blue-100">{ticket.category || 'General'}</span>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversation */}
            <div className="lg:col-span-2 space-y-4">
              {/* Original Message */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {ticket.customerId?.name?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{ticket.customerId?.name || 'Customer'}</p>
                      <p className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
              </div>

              {/* Replies */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  Conversation ({ticket.replies?.length || 0})
                </h3>
                <div className="space-y-3">
                  {ticket.replies?.map((r, idx) => (
                    <div key={idx} className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {r.adminId?.name?.charAt(0)?.toUpperCase() || 'A'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">
                            {r.adminId?.name || 'Support Team'}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(r.createdAt)}</p>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{r.message}</p>
                    </div>
                  ))}
                  {(!ticket.replies || ticket.replies.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p>No replies yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reply Box */}
              {ticket.status !== 'closed' && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Send Reply</h3>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your reply..."
                    rows="4"
                    className="input w-full resize-none"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <button className="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm">
                      <Paperclip className="w-4 h-4" />
                      Attach File
                    </button>
                    <Button
                      onClick={handleSendReply}
                      disabled={!reply.trim() || replyMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Status & Priority */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Ticket Details</h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-600 font-medium">Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="input w-full mt-1 text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    {newStatus !== ticket.status && (
                      <Button
                        size="sm"
                        onClick={handleStatusChange}
                        disabled={updateStatusMutation.isPending}
                        className="w-full mt-2 text-xs"
                      >
                        Update Status
                      </Button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 font-medium">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="input w-full mt-1 text-sm"
                    >
                      <option value="urgent">🔴 Urgent</option>
                      <option value="high">🟠 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                    {newPriority !== ticket.priority && (
                      <Button
                        size="sm"
                        onClick={handlePriorityChange}
                        disabled={updatePriorityMutation.isPending}
                        className="w-full mt-2 text-xs"
                      >
                        Update Priority
                      </Button>
                    )}
                  </div>

                  <div className="pt-2 border-t">
                    <label className="text-xs text-gray-600 font-medium">SLA Status</label>
                    <div className={`mt-1 p-2 rounded-lg ${slaStatus.color}`}>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {slaStatus.icon && <slaStatus.icon className="w-4 h-4" />}
                        {slaStatus.label}
                      </p>
                      <p className="text-xs mt-1">
                        SLA: {SLA_TIMES[ticket.priority] || 48}h | Age: {ageHours}h
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Customer</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {ticket.customerId?.name?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{ticket.customerId?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{ticket.customerId?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{formatDate(ticket.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Updated:</span>
                    <span className="font-medium">{formatDate(ticket.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CRMTickets;
