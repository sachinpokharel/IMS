// Define ToastType here if the module does not exist
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

export default defineNuxtPlugin((nuxtApp) => {
  // Create a global toast instance that will be populated by ToastContainer
  const toast: Toast = {
    add: () => '',
    success: () => '',
    error: () => '',
    warning: () => '',
    info: () => '',
    remove: () => {},
    clear: () => {},
  };

  // Provide it globally
  nuxtApp.provide('toast', toast);

  // Also set on window for client-side access
  if (import.meta.client) {
    (window as any).$toast = toast;
  }
});
