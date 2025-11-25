// FILE: apps/web/src/pages/dashboard/support/Tickets.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { MessageSquare, Clock, CheckCircle, XCircle, Eye, Send, X } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';

const Tickets = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [activeTab, setActiveTab] = useState('open'); // open, in_progress, resolved, closed

  // Fetch tickets
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['admin-tickets', activeTab, filterPriority],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Use activeTab for status filter
      params.append('status', activeTab);
      if (filterPriority) params.append('priority', filterPriority);
      const response = await api.get(`/tickets?${params}`);
      return response.data;
    },
  });

  // Fetch ticket details
  const { data: ticketDetail } = useQuery({
    queryKey: ['ticket', selectedTicket],
    queryFn: async () => {
      const response = await api.get(`/tickets/${selectedTicket}`);
      return response.data.data;
    },
    enabled: !!selectedTicket,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async () => {
      const response = await api.get('/tickets/stats');
      return response.data.data;
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
      queryClient.invalidateQueries(['admin-tickets']);
      setNewMessage('');
      toast.success('Reply sent successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to send reply');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }) => {
      const response = await api.put(`/tickets/${ticketId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', selectedTicket]);
      queryClient.invalidateQueries(['admin-tickets']);
      queryClient.invalidateQueries(['ticket-stats']);
      toast.success('Status updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update status');
    },
  });

  // Update priority mutation
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ ticketId, priority }) => {
      const response = await api.put(`/tickets/${ticketId}/priority`, { priority });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', selectedTicket]);
      queryClient.invalidateQueries(['admin-tickets']);
      toast.success('Priority updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update priority');
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    addMessageMutation.mutate({ ticketId: selectedTicket, message: newMessage });
  };

  const handleStatusChange = (ticketId, status) => {
    updateStatusMutation.mutate({ ticketId, status });
  };

  const handlePriorityChange = (ticketId, priority) => {
    updatePriorityMutation.mutate({ ticketId, priority });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'closed':
        return <XCircle className="w-5 h-5 text-gray-700" />;
      default:
        return null;
    }
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

    // Check who responded last and if it's been viewed
    if (ticket.lastResponseBy === 'user' && !ticket.adminViewed) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" />
          </svg>
          Awaiting Response
        </span>
      );
    }

    if (ticket.lastResponseBy === 'admin' && !ticket.userViewed) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Responded
        </span>
      );
    }

    if (ticket.lastResponseBy === 'admin' && ticket.userViewed) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" transform="translate(2, 0)" />
          </svg>
          Viewed by User
        </span>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const tickets = ticketsData?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Support Tickets</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-700">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <p className="text-sm text-blue-600">Open</p>
            <p className="text-2xl font-bold text-blue-900">{stats.open}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <p className="text-sm text-yellow-600">In Progress</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.inProgress}</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <p className="text-sm text-green-600">Resolved</p>
            <p className="text-2xl font-bold text-green-900">{stats.resolved}</p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-700">Closed</p>
            <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-hidden rounded-t-lg">
          <button
            onClick={() => setActiveTab('open')}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-colors relative ${
              activeTab === 'open'
                ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Open
            {stats && stats.open > 0 && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{stats.open}</span>}
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-colors relative ${
              activeTab === 'in_progress'
                ? 'text-yellow-600 bg-yellow-50 border-b-2 border-yellow-600'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            In Progress
            {stats && stats.inProgress > 0 && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">{stats.inProgress}</span>}
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-colors relative ${
              activeTab === 'resolved'
                ? 'text-green-600 bg-green-50 border-b-2 border-green-600'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Resolved
            {stats && stats.resolved > 0 && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{stats.resolved}</span>}
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-colors relative ${
              activeTab === 'closed'
                ? 'text-gray-700 bg-gray-100 border-b-2 border-gray-600'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Closed
            {stats && stats.closed > 0 && <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">{stats.closed}</span>}
          </button>
        </div>

        {/* Priority Filter */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by Priority:</label>
            <CustomSelect
              value={filterPriority}
              onChange={(value) => setFilterPriority(value)}
              options={[
                { value: '', label: 'All Priorities' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
              placeholder="All Priorities"
              className="w-48"
            />
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tickets Found</h3>
            <p className="text-gray-700">No support tickets match your filters.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">{getStatusIcon(ticket.status)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                      {getResponseStatusBadge(ticket)}
                    </div>

                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Ticket ID:</span> {ticket.ticketId}
                      {' • '}
                      <span className="font-medium">From:</span> {ticket.userId?.name} ({ticket.userId?.role})
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket._id)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Ticket Modal - Simplified version */}
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
              {/* Admin Controls */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={ticketDetail.status}
                    onChange={(e) => handleStatusChange(ticketDetail._id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={ticketDetail.priority}
                    onChange={(e) => handlePriorityChange(ticketDetail._id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Original Description */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">Original Request:</p>
                <p className="text-gray-900">{ticketDetail.description}</p>
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
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{msg.sender?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{msg.sender?.role || 'user'}</p>
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(msg.timestamp)}</p>
                      </div>
                      <p className="text-gray-900">{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              {ticketDetail.status !== 'closed' && (
                <form onSubmit={handleSendMessage} className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reply</label>
                  <div className="flex gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="Type your response..."
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

export default Tickets;
