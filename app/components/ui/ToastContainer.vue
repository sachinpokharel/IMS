<script setup lang="ts">
import type { ToastType } from './Toast.vue';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

const toasts = ref<ToastItem[]>([]);

function removeToast(id: string) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

// Get the injected toast from plugin and override its methods
const injectedToast = inject<any>('toast', null);

const toast = {
  add(options: Omit<ToastItem, 'id'>) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    if (import.meta.client) {
      toasts.value.push({ ...options, id });
    }
    return id;
  },
  success(title: string, description?: string) {
    return this.add({ type: 'success', title, description });
  },
  error(title: string, description?: string) {
    return this.add({ type: 'error', title, description });
  },
  warning(title: string, description?: string) {
    return this.add({ type: 'warning', title, description });
  },
  info(title: string, description?: string) {
    return this.add({ type: 'info', title, description });
  },
  remove(id: string) {
    if (import.meta.client) {
      removeToast(id);
    }
  },
  clear() {
    if (import.meta.client) {
      toasts.value = [];
    }
  },
};

// Override the injected toast methods with actual implementation
if (injectedToast) {
  Object.assign(injectedToast, toast);
}

// Also register on window for client
if (import.meta.client) {
  (window as any).$toast = toast;
}

defineExpose({ toast });
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-1.5 p-3 sm:max-w-sm"
      aria-live="polite"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-100 ease-in absolute"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        move-class="transition-all duration-200 ease-out"
      >
        <UiToast
          v-for="toast in toasts"
          :key="toast.id"
          v-bind="toast"
          @close="removeToast"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>
