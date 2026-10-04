import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing, shadows } from '../../theme/tokens';

type ToastType = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'success' && styles.success,
            toast.type === 'error' && styles.error,
          ]}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    // High enough to clear the bottom menu and a chat's message box.
    bottom: 96,
    left: spacing[2],
    right: spacing[2],
    backgroundColor: colors.text,
    padding: spacing[2],
    borderRadius: radius.card,
    ...shadows.md,
  },
  success: { backgroundColor: colors.success },
  error: { backgroundColor: colors.error },
  text: { color: colors.white, fontSize: 14, textAlign: 'center' },
});
