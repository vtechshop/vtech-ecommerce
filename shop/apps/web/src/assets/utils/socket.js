// FILE: apps/web/src/assets/utils/socket.js
// Singleton Socket.io client — authenticated via access token cookie
import { io } from 'socket.io-client';
import Cookies from 'js-cookie';

// Strip /api suffix if present — socket connects to the server root
const rawUrl = import.meta.env.VITE_API_URL || 'https://api.vtechkitchen.com';
const SERVER_URL = rawUrl.replace(/\/api\/?$/, '');

let socket = null;

export function getSocket() {
  if (socket) return socket;

  const token = Cookies.get('accessToken');

  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    auth: { token: token || null },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.debug('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.debug('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.debug('[Socket] Connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
