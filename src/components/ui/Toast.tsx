import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const TOAST_ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
  warning: 'warning',
};

const TOAST_COLORS: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: { bg: '#D1FAE5', icon: colors.success, border: '#6EE7B7' },
  error: { bg: '#FEE2E2', icon: colors.error, border: '#FCA5A5' },
  info: { bg: '#DBEAFE', icon: colors.info, border: '#93C5FD' },
  warning: { bg: '#FEF3C7', icon: colors.warning, border: '#FCD34D' },
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => dismiss(), toast.duration || 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  };

  const c = TOAST_COLORS[toast.type];

  return (
    <Animated.View style={[styles.toast, { backgroundColor: c.bg, borderLeftColor: c.border, transform: [{ translateY }], opacity }]}>
      <Ionicons name={TOAST_ICONS[toast.type]} size={22} color={c.icon} />
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>{toast.title}</Text>
        {toast.message && <Text style={styles.toastMessage}>{toast.message}</Text>}
      </View>
      <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, type, title, message, duration }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={[styles.container, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
    ...shadows.lg,
  },
  toastContent: { flex: 1, marginLeft: spacing.sm },
  toastTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  toastMessage: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});
