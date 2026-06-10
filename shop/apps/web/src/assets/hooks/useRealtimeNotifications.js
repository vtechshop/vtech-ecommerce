// FILE: apps/web/src/hooks/useRealtimeNotifications.js
// Manages real-time notifications via Socket.io
import { useState, useEffect, useCallback } from 'react';
import { getSocket, disconnectSocket } from '@/utils/socket';
import useAuth from '@/hooks/useAuth';

const MAX_NOTIFICATIONS = 20;

export default function useRealtimeNotifications() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => {
      const updated = [notification, ...prev].slice(0, MAX_NOTIFICATIONS);
      return updated;
    });
    setUnreadCount((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    // Order confirmed (customer)
    socket.on('order_confirmed', (data) => {
      addNotification({
        id: Date.now(),
        type: 'order_confirmed',
        title: 'Order Confirmed',
        message: `Your order #${data.orderNumber} has been placed successfully.`,
        link: '/dashboard/orders',
        at: new Date(),
      });
    });

    // Order shipped (customer)
    socket.on('order_shipped', (data) => {
      addNotification({
        id: Date.now(),
        type: 'order_shipped',
        title: 'Order Shipped',
        message: `Order #${data.orderNumber} is on its way! AWB: ${data.awb}`,
        link: '/dashboard/orders',
        at: new Date(),
      });
    });

    // New order alert (vendor)
    socket.on('new_order', (data) => {
      addNotification({
        id: Date.now(),
        type: 'new_order',
        title: 'New Order',
        message: `You have a new order #${data.orderNumber} (${data.itemCount} item${data.itemCount !== 1 ? 's' : ''}).`,
        link: '/vendor-dashboard/orders',
        at: new Date(),
      });
    });

    return () => {
      socket.off('order_confirmed');
      socket.off('order_shipped');
      socket.off('new_order');
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

  const markAllRead = useCallback(() => setUnreadCount(0), []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, markAllRead, clearAll };
}
