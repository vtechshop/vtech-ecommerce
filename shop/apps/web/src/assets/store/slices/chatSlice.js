// apps/web/src/assets/store/slices/chatSlice.js
import { createSlice } from '@reduxjs/toolkit';

const CHAT_STORAGE_KEY_PREFIX = 'vtech_chat_messages';

// Get user-specific storage key
const getChatStorageKey = (userId) => {
  if (userId) {
    return `${CHAT_STORAGE_KEY_PREFIX}_${userId}`;
  }
  // For guest users, use session-specific key
  let guestId = sessionStorage.getItem('guest_chat_id');
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('guest_chat_id', guestId);
  }
  return `${CHAT_STORAGE_KEY_PREFIX}_${guestId}`;
};

const initialState = {
  isOpen: false,
  messages: [],
  sending: false,
  error: null,
  currentUserId: null, // Track current user ID
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    openChat(state) {
      state.isOpen = true;
    },
    closeChat(state) {
      state.isOpen = false;
    },
    toggleChat(state) {
      state.isOpen = !state.isOpen;
    },
    addMessage(state, action) {
      const newMessage = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        role: action.payload.role || 'user',
        text: action.payload.text || '',
        timestamp: action.payload.timestamp || Date.now(),
      };
      state.messages.push(newMessage);

      // Persist to localStorage with user-specific key
      try {
        const storageKey = getChatStorageKey(state.currentUserId);
        localStorage.setItem(storageKey, JSON.stringify(state.messages));
      } catch (error) {
        console.error('Failed to save chat messages to localStorage:', error);
      }
    },
    clearChat(state) {
      state.messages = [];
      try {
        const storageKey = getChatStorageKey(state.currentUserId);
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.error('Failed to clear chat messages from localStorage:', error);
      }
    },
    loadMessagesFromStorage(state, action) {
      try {
        const userId = action.payload; // Get userId from payload
        state.currentUserId = userId || null;

        const storageKey = getChatStorageKey(userId);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const messages = JSON.parse(stored);
          // Only load recent messages (last 50)
          state.messages = messages.slice(-50);
        } else {
          state.messages = [];
        }
      } catch (error) {
        console.error('Failed to load chat messages from localStorage:', error);
        state.messages = [];
      }
    },
    setCurrentUser(state, action) {
      const newUserId = action.payload;

      // If user changed, clear current messages and load new user's messages
      if (state.currentUserId !== newUserId) {
        state.currentUserId = newUserId;
        state.messages = [];

        // Load messages for new user
        try {
          const storageKey = getChatStorageKey(newUserId);
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const messages = JSON.parse(stored);
            state.messages = messages.slice(-50);
          }
        } catch (error) {
          console.error('Failed to load messages for new user:', error);
        }
      }
    },
    setSending(state, action) {
      state.sending = Boolean(action.payload);
    },
    setChatError(state, action) {
      state.error = action.payload || null;
    },
  },
});

export const {
  openChat,
  closeChat,
  toggleChat,
  addMessage,
  clearChat,
  loadMessagesFromStorage,
  setCurrentUser,
  setSending,
  setChatError,
} = chatSlice.actions;

export default chatSlice.reducer;
