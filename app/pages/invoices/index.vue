<script setup lang="ts">
import type { Invoice } from '~/composables/useInvoices';

const router = useRouter();
const { invoices, fetchInvoices } = useInvoices();
const toast = useToast();

const statusFilter = ref<'all' | 'draft' | 'finalized' | 'paid' | 'cancelled'>('all');
const filteredInvoices = computed(() => {
  if (!invoices.value) return [];
  if (statusFilter.value === 'all') return invoices.value;
  return invoices.value.filter((inv) => inv.status === statusFilter.value);
});

const stats = computed(() => {
  if (!invoices.value) return { total: 0, paid: 0, pending: 0, draft: 0 };
  
  return {
    total: invoices.value.reduce((sum, inv) => sum + inv.totalAmount, 0),
    paid: invoices.value.filter((inv) => inv.status === 'paid').length,
    pending: invoices.value.filter((inv) => inv.status === 'finalized').length,
    draft: invoices.value.filter((inv) => inv.status === 'draft').length,
  };
});

function getStatusColor(status: string) {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'finalized':
      return 'bg-blue-100 text-blue-800';
    case 'paid':
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

function formatDate(date: number | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-NP');
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          Invoices
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          Manage customer invoices and payments.
        </p>
      </div>
      <NuxtLink
        to="/invoices/new"
        class="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 transition-all"
      >
        <Icon name="lucide:plus" class="h-4 w-4" />
        New Invoice
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
            <Icon name="lucide:receipt" class="h-5 w-5" />
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Paid Invoices
            </p>
            <p class="mt-1 text-xl font-semibold text-green-600">
              {{ stats.paid }}
            </p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
            <Icon name="lucide:check-circle" class="h-5 w-5" />
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Pending
            </p>
            <p class="mt-1 text-xl font-semibold text-blue-600">
              {{ stats.pending }}
            </p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Icon name="lucide:clock" class="h-5 w-5" />
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Drafts
            </p>
            <p class="mt-1 text-xl font-semibold text-gray-600">
              {{ stats.draft }}
            </p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <Icon name="lucide:file-text" class="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Buttons -->
    <div class="flex gap-2">
      <button
        v-for="status in ['all', 'draft', 'finalized', 'paid', 'cancelled']"
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

    <!-- Invoices Table -->
    <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div v-if="filteredInvoices.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice #
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
              v-for="invoice in filteredInvoices"
              :key="invoice.id"
              class="hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ invoice.invoiceNumber }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ invoice.customer?.name || 'Unknown' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                {{ formatCurrency(invoice.totalAmount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span
                  :class="[
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                    getStatusColor(invoice.status),
                  ]"
                >
                  {{ invoice.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ formatDate(invoice.issuedDate) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <NuxtLink
                  :to="`/invoices/${invoice.id}`"
                  class="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Icon name="lucide:eye" class="h-4 w-4" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="flex flex-col items-center justify-center py-12 text-gray-400">
        <Icon name="lucide:receipt" class="h-12 w-12 mb-3" />
        <p class="text-sm">No invoices found</p>
      </div>
    </div>
  </div>
</template>
