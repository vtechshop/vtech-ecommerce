// FILE: apps/web/src/pages/dashboard/admin/CRMTickets.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { formatDate } from '@/utils/format';
import { MessageSquare, Search, Filter, AlertCircle, CheckCircle, Clock, XCircle, Send, Paperclip } from 'lucide-react';
import NewBadge from '@/components/common/NewBadge';
import { getNewItemClasses, formatRelativeTime } from '@/utils/dateHelpers';

const CRMTickets = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingTicket, setViewingTicket] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['crm-tickets', page, statusFilter, priorityFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin/crm/tickets?${params}`);
      return response.data;
    },
  });

  const { data: statsData } = useQuery({
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
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-blue-100 text-gray-900';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-blue-100 text-gray-900';
      default:
        return 'bg-blue-100 text-gray-900';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-4 h-4" />;
      case 'in-progress':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'closed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">CRM - Support Tickets</h1>
          <p className="text-gray-700 mt-1">Manage customer support requests</p>
        </div>
        <Button className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          New Ticket
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Open Tickets</p>
              <p className="text-2xl font-bold mt-1">{stats.open || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">In Progress</p>
              <p className="text-2xl font-bold mt-1">{stats.inProgress || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Resolved</p>
              <p className="text-2xl font-bold mt-1">{stats.resolved || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Avg Response Time</p>
              <p className="text-2xl font-bold mt-1">{stats.avgResponseTime || '0h'}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
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
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Status' },
              { value: 'open', label: 'Open' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
            placeholder="All Status"
            className="w-full"
          />
          <CustomSelect
            value={priorityFilter}
            onChange={(value) => {
              setPriorityFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Priority' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            placeholder="All Priority"
            className="w-full"
          />
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setPriorityFilter('');
              setPage(1);
            }}
            className="flex items-center gap-2"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Ticket ID</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Subject</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Priority</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Created</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket._id} className={`border-b last:border-b-0 transition-colors ${getNewItemClasses(ticket.createdAt)}`}>
                  <td className="py-3 px-3 sm:px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">#{ticket.ticketNumber || ticket._id.slice(-6)}</span>
                      <NewBadge createdAt={ticket.createdAt} />
                    </div>
                    <div className="text-xs text-gray-500">{formatRelativeTime(ticket.createdAt)}</div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <p className="font-medium">{ticket.subject}</p>
                    <p className="text-xs text-gray-700 line-clamp-1">{ticket.message}</p>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <p className="font-medium text-sm">{ticket.customerId?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-700">{ticket.customerId?.email || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority?.toUpperCase() || 'MEDIUM'}
                    </span>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      {ticket.status?.replace('-', ' ').toUpperCase() || 'OPEN'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">{formatDate(ticket.createdAt)}</td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(ticket)}
                      className="text-xs"
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
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
  const [reply, setReply] = useState('');
  const [newStatus, setNewStatus] = useState(ticket.status);

  const updateStatusMutation = useMutation({
    mutationFn: async (status) => {
      await api.put(`/admin/crm/tickets/${ticket._id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tickets'] });
      alert('Ticket status updated');
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (message) => {
      await api.post(`/admin/crm/tickets/${ticket._id}/reply`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tickets'] });
      setReply('');
      alert('Reply sent successfully');
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">Ticket #{ticket.ticketNumber || ticket._id.slice(-6)}</h2>
            <p className="text-sm text-gray-700">{ticket.subject}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Ticket Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-blue-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {ticket.customerId?.name?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{ticket.customerId?.name || 'Customer'}</p>
                      <p className="text-xs text-gray-700">{formatDate(ticket.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{ticket.message}</p>
              </div>

              {/* Replies Section */}
              <div>
                <h3 className="font-semibold mb-3">Replies</h3>
                <div className="space-y-3">
                  {ticket.replies?.map((r, idx) => (
                    <div key={idx} className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-sm">{r.adminId?.name || 'Support Team'}</p>
                        <p className="text-xs text-gray-700">{formatDate(r.createdAt)}</p>
                      </div>
                      <p className="text-sm text-gray-700">{r.message}</p>
                    </div>
                  ))}
                  {(!ticket.replies || ticket.replies.length === 0) && (
                    <p className="text-gray-700 text-sm text-center py-4">No replies yet</p>
                  )}
                </div>
              </div>

              {/* Reply Box */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Send Reply</h3>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  rows="4"
                  className="input w-full resize-none"
                />
                <div className="flex items-center justify-between mt-3">
                  <button className="text-gray-700 hover:text-gray-900 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Attach File
                  </button>
                  <Button
                    onClick={handleSendReply}
                    disabled={!reply.trim() || replyMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Reply
                  </Button>
                </div>
              </div>
            </div>

            {/* Ticket Details Sidebar */}
            <div className="space-y-4">
              <div className="bg-blue-100 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-sm">Ticket Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-700">Status</label>
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
                        className="w-full mt-2 text-xs"
                      >
                        Update Status
                      </Button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-700">Priority</label>
                    <p className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-1 ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' : ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' : ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {ticket.priority?.toUpperCase() || 'MEDIUM'}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-700">Category</label>
                    <p className="text-sm font-medium mt-1">{ticket.category || 'General'}</p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-700">Customer</label>
                    <p className="text-sm font-medium mt-1">{ticket.customerId?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-700">{ticket.customerId?.email || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-700">Created</label>
                    <p className="text-sm font-medium mt-1">{formatDate(ticket.createdAt)}</p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-700">Last Updated</label>
                    <p className="text-sm font-medium mt-1">{formatDate(ticket.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-blue-100 flex items-center justify-end gap-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CRMTickets;
