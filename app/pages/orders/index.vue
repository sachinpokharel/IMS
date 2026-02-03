<script setup lang="ts">
import type { Order } from '~/composables/useOrders';

const router = useRouter();
const { orders, fetchOrders } = useOrders();
const toast = useToast();

const statusFilter = ref<'all' | 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled'>('all');
const filteredOrders = computed(() => {
  if (!orders.value) return [];
  if (statusFilter.value === 'all') return orders.value;
  return orders.value.filter((order) => order.status === statusFilter.value);
});

const stats = computed(() => {
  if (!orders.value) return { total: 0, pending: 0, confirmed: 0, completed: 0 };
  
  return {
    total: orders.value.reduce((sum, order) => sum + order.totalAmount, 0),
    pending: orders.value.filter((order) => order.status === 'pending').length,
    confirmed: orders.value.filter((order) => order.status === 'confirmed').length,
    completed: orders.value.filter((order) => order.status === 'completed').length,
  };
});

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'processing':
      return 'bg-purple-100 text-purple-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-NP');
}

onMounted(async () => {
  try {
    await fetchOrders();
  } catch (error) {
    toast.error('Failed to load orders');
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          Orders
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          Manage customer orders.
        </p>
      </div>
      <NuxtLink
        to="/orders/new"
        class="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 transition-all"
      >
        <Icon name="lucide:plus" class="h-4 w-4" />
        New Order
      </NuxtLink>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 md:grid-cols-4">
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Amount
            </p>
            <p class="mt-1 text-xl font-semibold text-gray-900">
              {{ formatCurrency(stats.total) }}
            </p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Icon name="lucide:shopping-cart" class="h-5 w-5" />
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Pending Orders
            </p>
            <p class="mt-1 text-xl font-semibold text-yellow-600">
              {{ stats.pending }}
            </p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
            <Icon name="lucide:clock" class="h-5 w-5" />
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Confirmed
            </p>
            <p class="mt-1 text-xl font-semibold text-blue-600">
              {{ stats.confirmed }}
            </p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Icon name="lucide:check-circle" class="h-5 w-5" />
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Completed
            </p>
            <p class="mt-1 text-xl font-semibold text-green-600">
              {{ stats.completed }}
            </p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
            <Icon name="lucide:package-check" class="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Buttons -->
    <div class="flex gap-2">
      <button
        v-for="status in ['all', 'pending', 'confirmed', 'processing', 'completed', 'cancelled']"
        :key="status"
        @click="statusFilter = status as any"
        :class="[
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          statusFilter === status
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        ]"
      >
        {{ status.charAt(0).toUpperCase() + status.slice(1) }}
      </button>
    </div>

    <!-- Orders Table -->
    <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div v-if="filteredOrders.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order #
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="order in filteredOrders"
              :key="order.id"
              class="hover:bg-gray-50 transition-colors cursor-pointer"
              @click="router.push(`/orders/${order.id}`)"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ order.orderNumber }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ order.customer?.name || 'Unknown' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                {{ formatCurrency(order.totalAmount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span
                  :class="[
                    'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                    getStatusColor(order.status),
                  ]"
                >
                  {{ order.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span
                  :class="[
                    'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    order.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ order.paymentStatus }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ formatDate(order.orderDate) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end gap-2">
                  <NuxtLink
                    v-if="order.status === 'confirmed' || order.status === 'processing' || order.status === 'completed'"
                    :to="`/orders/print/${order.id}`"
                    @click.stop
                    class="text-green-600 hover:text-green-900 transition-colors"
                    title="Print Receipt"
                  >
                    <Icon name="lucide:printer" class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    @click.stop="router.push(`/orders/${order.id}`)"
                    class="text-blue-600 hover:text-blue-900 transition-colors"
                  >
                    View
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="px-6 py-12 text-center">
        <Icon name="lucide:shopping-cart" class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-semibold text-gray-900">No orders</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by creating a new order.</p>
        <div class="mt-6">
          <NuxtLink
            to="/orders/new"
            class="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black"
          >
            <Icon name="lucide:plus" class="h-4 w-4" />
            New Order
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
