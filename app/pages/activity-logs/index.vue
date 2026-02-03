<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Activity Logs</h1>
      <p class="mt-1 text-sm text-gray-500">
        Track all user actions and system events
      </p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Activities"
        :value="stats.totalActivities"
        icon="lucide:activity"
        color="blue"
      />
      <StatCard
        title="Created"
        :value="getStatCount('created')"
        icon="lucide:plus-circle"
        color="green"
      />
      <StatCard
        title="Updated"
        :value="getStatCount('updated')"
        icon="lucide:edit"
        color="blue"
      />
      <StatCard
        title="Deleted"
        :value="getStatCount('deleted')"
        icon="lucide:trash-2"
        color="red"
      />
    </div>

    <!-- Filters -->
    <div class="bg-white shadow rounded-lg p-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search logs..."
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            @input="handleSearch"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Action
          </label>
          <select
            v-model="actionFilter"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            @change="handleFilterChange"
          >
            <option value="">All Actions</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Entity Type
          </label>
          <select
            v-model="entityTypeFilter"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            @change="handleFilterChange"
          >
            <option value="">All Types</option>
            <option value="product">Product</option>
            <option value="invoice">Invoice</option>
            <option value="order">Order</option>
            <option value="customer">Customer</option>
            <option value="user">User</option>
            <option value="category">Category</option>
            <option value="supplier">Supplier</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Activity Logs Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Time
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                User
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Action
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Entity
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Details
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                IP Address
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="logs.length === 0">
              <td colspan="6" class="px-6 py-12 text-center">
                <EmptyState
                  icon="lucide:activity"
                  title="No activity logs found"
                  description="Activity will appear here when users perform actions"
                />
              </td>
            </tr>
            <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDate(log.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ log.user?.name }}
                </div>
                <div class="text-sm text-gray-500">{{ log.user?.email }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    getActionColor(log.action),
                  ]"
                >
                  <Icon :name="getActionIcon(log.action)" class="h-3 w-3" />
                  {{ log.action }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ log.entityType }}</div>
                <div v-if="log.entityName" class="text-sm text-gray-500">
                  {{ log.entityName }}
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                <template v-if="log.details">
                  {{ formatDetails(log.details) }}
                </template>
                <template v-else> - </template>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ log.ipAddress || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="logs.length > 0"
        class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6"
      >
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="previousPage"
            :disabled="pagination.page === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            @click="nextPage"
            :disabled="!pagination.hasMore"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Page <span class="font-medium">{{ pagination.page }}</span>
            </p>
          </div>
          <div class="flex gap-2">
            <button
              @click="previousPage"
              :disabled="pagination.page === 1"
              class="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="lucide:chevron-left" class="h-4 w-4" />
            </button>
            <button
              @click="nextPage"
              :disabled="!pagination.hasMore"
              class="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="lucide:chevron-right" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { logs, stats, pagination, setFilters, nextPage, previousPage, getActionColor, getActionIcon } =
  useActivityLogs();

const searchQuery = ref('');
const actionFilter = ref('');
const entityTypeFilter = ref('');

let searchTimeout: ReturnType<typeof setTimeout>;

function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    setFilters({ search: searchQuery.value, page: 1 });
  }, 500);
}

function handleFilterChange() {
  setFilters({
    action: actionFilter.value || undefined,
    entityType: entityTypeFilter.value || undefined,
    page: 1,
  });
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDetails(details: any): string {
  if (typeof details === 'string') return details;
  if (typeof details === 'object') {
    const entries = Object.entries(details);
    if (entries.length === 0) return '-';
    return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
  }
  return JSON.stringify(details);
}

function getStatCount(action: string): number {
  if (!stats.value?.stats) return 0;
  return stats.value.stats
    .filter((s: any) => s.action === action)
    .reduce((sum: number, s: any) => sum + (s.count || 0), 0);
}
</script>
