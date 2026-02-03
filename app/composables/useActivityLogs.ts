export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ActivityLogFilters {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
  search?: string;
}

export function useActivityLogs() {
  const filters = ref<ActivityLogFilters>({
    page: 1,
    limit: 50,
  });

  const { data: logsData, refresh: refreshLogs } = useFetch<{
    data: ActivityLog[];
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }>(
    '/api/activity-logs',
    {
      key: 'activity-logs',
      query: filters,
      lazy: true,
      default: () => ({ data: [], pagination: { page: 1, limit: 50, hasMore: false } }),
      transform: (data) => ({
        ...data,
        data: data.data.map((log: any) => ({
          ...log,
          createdAt: new Date(log.createdAt),
        })),
      }),
    }
  );

  const { data: statsData } = useFetch('/api/activity-logs/stats', {
    key: 'activity-logs-stats',
    lazy: true,
  });

  const logs = computed(() => logsData.value?.data ?? []);
  const pagination = computed(() => logsData.value?.pagination ?? { page: 1, limit: 50, hasMore: false });
  const stats = computed(() => statsData.value ?? { stats: [], totalActivities: 0 });

  function setFilters(newFilters: Partial<ActivityLogFilters>) {
    filters.value = { ...filters.value, ...newFilters };
  }

  function nextPage() {
    if (pagination.value.hasMore) {
      filters.value.page = (filters.value.page ?? 1) + 1;
    }
  }

  function previousPage() {
    if ((filters.value.page ?? 1) > 1) {
      filters.value.page = (filters.value.page ?? 1) - 1;
    }
  }

  function getActionColor(action: string): string {
    const colors: Record<string, string> = {
      created: 'text-green-600 bg-green-50',
      updated: 'text-blue-600 bg-blue-50',
      deleted: 'text-red-600 bg-red-50',
      login: 'text-purple-600 bg-purple-50',
      logout: 'text-gray-600 bg-gray-50',
    };
    return colors[action] ?? 'text-gray-600 bg-gray-50';
  }

  function getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      created: 'lucide:plus-circle',
      updated: 'lucide:edit',
      deleted: 'lucide:trash-2',
      login: 'lucide:log-in',
      logout: 'lucide:log-out',
    };
    return icons[action] ?? 'lucide:activity';
  }

  return {
    logs,
    stats,
    pagination,
    filters: readonly(filters),
    setFilters,
    nextPage,
    previousPage,
    refresh: refreshLogs,
    getActionColor,
    getActionIcon,
  };
}
