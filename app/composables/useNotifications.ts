export interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  description?: string | null;
  href?: string | null;
  read: boolean;
  createdAt: Date;
  generatedId?: string | null;
}

export function useNotifications() {
  const { user, refreshSession } = useAuth();
  const { loggedIn } = useUserSession();
  
  const notifications = ref<Notification[]>([]);
  const pending = ref(false);

  const unreadCount = computed(() => {
    return notifications.value?.filter((n) => !n.read).length ?? 0;
  });

  async function refreshNotifications() {
    try {
      pending.value = true;
      
      // Ensure session is loaded before making API calls
      if (!loggedIn.value) {
        await refreshSession();
      }

      // Skip if still not authenticated
      if (!loggedIn.value) {
        return;
      }

      const data = await $fetch<Notification[]>('/api/notifications');
      
      // Convert date strings to Date objects
      notifications.value = data.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
      }));
    } catch (error: any) {
      // Silently ignore 401 errors (user not authenticated)
      if (error?.statusCode !== 401 && error?.response?.status !== 401) {
        console.error('Failed to fetch notifications:', error);
      }
    } finally {
      pending.value = false;
    }
  }

  async function markAsRead(id: string) {
    try {
      await $fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        body: { read: true },
      });
      
      // Update local state
      const notification = notifications.value?.find((n) => n.id === id);
      if (notification) {
        notification.read = true;
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      await $fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      
      // Update local state
      notifications.value?.forEach((n) => {
        n.read = true;
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  async function syncGeneratedNotifications() {
    try {
      // Ensure session is available before making API calls
      if (!loggedIn.value) {
        await refreshSession();
      }
      
      // Skip if still not authenticated
      if (!loggedIn.value) {
        return;
      }
      
      // Get all current generatedIds from notifications
      const generatedIds = notifications.value
        ?.filter((n) => n.generatedId)
        .map((n) => n.generatedId!) ?? [];

      await $fetch('/api/notifications/sync-generated', {
        method: 'POST',
        body: { generatedIds },
      });

      // Refresh to get new notifications
      await refreshNotifications();
    } catch (error: any) {
      // Silently ignore 401 errors (user not authenticated)
      if (error?.statusCode !== 401 && error?.response?.status !== 401) {
        console.error('Failed to sync generated notifications:', error);
      }
    }
  }

  return {
    notifications: computed(() => notifications.value ?? []),
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: refreshNotifications,
    syncGeneratedNotifications,
  };
}
