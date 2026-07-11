// FILE: apps/web/src/hooks/useRealtimeNotifications.js
import { useState, useEffect, useCallback } from 'react';
import { getSocket, disconnectSocket } from '@/utils/socket';
import useAuth from '@/hooks/useAuth';

const MAX_NOTIFICATIONS = 20;

export default function useRealtimeNotifications() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch existing unread notifications from REST API on login
  useEffect(() => {
    if (!isAuthenticated) return;

    fetch('/api/notifications?limit=20', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((res) => {
        if (!res?.data) return;
        const items = res.data.map((n) => ({
          id: n._id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link || null,
          at: n.createdAt,
          read: n.read,
        }));
        setNotifications(items.slice(0, MAX_NOTIFICATIONS));
        setUnreadCount(items.filter((n) => !n.read).length);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
    setUnreadCount((n) => n + 1);
  }, []);

  // Listen for real-time socket events
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    socket.on('notification', (data) => {
      addNotification({
        id: data.id || Date.now(),
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        at: data.at || new Date(),
        read: false,
      });
    });

    return () => {
      socket.off('notification');
    };
  }, [isAuthenticated, addNotification]);

  // Disconnect socket on logout
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Persist read state to backend
    fetch('/api/notifications/mark-read', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'all' }),
    }).catch(() => {});
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, markAllRead, clearAll };
}
