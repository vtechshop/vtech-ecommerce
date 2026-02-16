// FILE: apps/web/src/components/chatbot/ChatWidget.jsx
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MessageCircle, X, Send, Paperclip, Minimize2, Maximize2 } from 'lucide-react';
import {
  toggleChat,
  addMessage,
  setSending,
  setChatError,
  loadMessagesFromStorage,
  setCurrentUser,
} from '@/store/slices/chatSlice';
import api from '@/utils/api';

const ChatWidget = () => {
  const dispatch = useDispatch();
  const chat = useSelector((state) => state.chat) || {};
  const auth = useSelector((state) => state.auth) || {};
  const user = auth.user;
  const isOpen = chat.isOpen ?? false;
  const messages = chat.messages ?? [];
  const sending = chat.sending ?? false;
  const error = chat.error ?? null;

  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load messages from localStorage on mount and when user changes
  useEffect(() => {
    const userId = user?._id || user?.id || null;
    dispatch(loadMessagesFromStorage(userId));
    dispatch(setCurrentUser(userId));
  }, [dispatch, user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isOpen && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Update unread count
  useEffect(() => {
    if (!isOpen) {
      const lastUserMessageIndex = messages.findLastIndex(m => m.role === 'user');
      const unreadMessages = messages.slice(lastUserMessageIndex + 1).filter(m => m.role === 'assistant');
      setUnreadCount(unreadMessages.length);
    } else {
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Send initial greeting if no messages
  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      const greeting = {
        role: 'assistant',
        text: "👋 Hi! I'm your shopping assistant. How can I help you today?\n\nI can help with:\n• Order tracking\n• Product information\n• Shipping & delivery\n• Returns & refunds\n• Payment methods",
      };
      dispatch(addMessage(greeting));
    }
  }, [isOpen, messages.length, dispatch]);

  const handleToggle = () => {
    dispatch(toggleChat());
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    // Add user message
    dispatch(addMessage({ role: 'user', text }));
    setInput('');

    // Clear any previous errors
    dispatch(setChatError(null));

    try {
      dispatch(setSending(true));
      setIsTyping(true);

      // Brief typing indicator for UX
      await new Promise(resolve => setTimeout(resolve, 200));

      // Call chatbot API
      const { data } = await api.post('/chatbot/message', { message: text });

      setIsTyping(false);

      // Add bot response
      dispatch(addMessage({
        role: 'assistant',
        text: data.data.reply
      }));
    } catch (err) {
      setIsTyping(false);
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Sorry, I encountered an error. Please try again.';
      // Only add error message to chat, don't set separate error state
      dispatch(addMessage({
        role: 'assistant',
        text: errorMessage
      }));
      console.error('Chatbot error:', err);
    } finally {
      dispatch(setSending(false));
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, just show a message that file upload is coming soon
      dispatch(addMessage({
        role: 'assistant',
        text: `📎 File upload feature coming soon! You tried to upload: ${file.name}`
      }));
      e.target.value = ''; // Reset input
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Don't show chatbot for admin users - must be after ALL hooks
  if (user?.role === 'admin') {
    return null;
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 rounded-full shadow-lg bg-primary-600 text-white w-14 h-14 flex items-center justify-center hover:bg-primary-700 transition-all hover:scale-110 z-50"
        aria-label="Open chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-24 right-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden transition-all z-40 ${
            isMinimized ? 'w-80 h-14' : 'w-96 h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-semibold">Chat Support</span>
              <span className="text-xs opacity-75">Online</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMinimize}
                className="opacity-90 hover:opacity-100 transition-opacity"
                aria-label="Minimize chat"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleToggle}
                className="opacity-90 hover:opacity-100 transition-opacity"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Container */}
              <div className="p-4 h-[480px] overflow-y-auto space-y-3 bg-gray-50 dark:bg-gray-900">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-2 rounded-2xl shadow-sm ${
                        m.role === 'user'
                          ? 'bg-primary-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>
                      <div className={`text-xs mt-1 ${m.role === 'user' ? 'text-primary-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatTime(m.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form
                onSubmit={handleSend}
                className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleFileAttach}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100 transition-all"
                    placeholder="Type your message..."
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
