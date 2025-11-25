// FILE: apps/web/src/components/common/ToastContainer.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import Toast from './Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children, maxToasts = 3 }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();

    setToasts((prev) => {
      // Check if same message already exists
      const existingToast = prev.find(
        (t) => t.message === message && t.type === type
      );

      // Don't add duplicate toast if it exists within last 2 seconds
      if (existingToast) {
        return prev;
      }

      // Add new toast and limit to maxToasts
      const newToasts = [...prev, { id, message, type, duration }];

      // Keep only the last maxToasts toasts
      return newToasts.slice(-maxToasts);
    });

    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = {
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container - Fixed position top-right below header */}
      <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
