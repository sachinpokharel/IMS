// Define ToastType here if not available elsewhere

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface Toast {
  add: (options: ToastOptions) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  remove: (id: string) => void;
  clear: () => void;
}

export function useToast(): Toast {
  // Use Nuxt's $toast from plugin
  const { $toast } = useNuxtApp();
  
  if ($toast) {
    return $toast as Toast;
  }

  // Fallback to injection
  const injected = inject<Toast | null>('toast', null);
  if (injected) {
    return injected;
  }

  // Fallback to window.$toast if available (client-side only)
  if (import.meta.client && (window as any).$toast) {
    return (window as any).$toast;
  }

  // During SSR or if toast is not available, return no-op silently
  return {
    add: () => '',
    success: () => '',
    error: () => '',
    warning: () => '',
    info: () => '',
    remove: () => {},
    clear: () => {},
  };
}
