
<script setup lang="ts">
import PrintA4 from '~/components/print-paper/PrintA4.vue';
import Print80mm from '~/components/print-paper/Print80mm.vue';
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInvoices } from '~/composables/useInvoices';
import { useCustomers } from '~/composables/useCustomers';
import { useSettings } from '~/composables/useSettings';
import { useAuth } from '~/composables/useAuth';

const route = useRoute();
const router = useRouter();
const { getInvoice } = useInvoices();
const { customers } = useCustomers();
const { settings } = useSettings();
const { user } = useAuth();

const invoice = ref<any>(null);
const customer = ref<any>(null);
const loading = ref(true);
const layoutOptions = [
  { label: 'A4', value: 'a4' },
  { label: '80mm Thermal', value: '80mm' },
];
const selectedLayout = ref('a4');

onMounted(async () => {
  const id = route.params.id as string;
  try {
    invoice.value = await getInvoice(id);
    const customersData = customers.value || [];
    customer.value = customersData.find(c => c.id === invoice.value?.customerId);
  } catch (error) {
    console.error('Failed to load invoice');
    router.back();
  } finally {
    loading.value = false;
  }
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: any) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-NP');
}

const isPrint = computed(() => route.query.print === 'true');

function handlePrint() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center min-h-screen">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-gray-400" />
  </div>
  <div v-else-if="invoice" class="bg-white">
    <div v-if="!isPrint" data-no-print class="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex gap-3">
      <button
        @click="handlePrint"
        class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
      >
        <Icon name="lucide:printer" class="h-4 w-4" />
        Print Invoice
      </button>
      <NuxtLink
        :to="`/invoices/${invoice?.id}`"
        class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 transition-all"
      >
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
        Back to Invoice
      </NuxtLink>
      <!-- Layout Selector -->
      <select v-model="selectedLayout" class="ml-4 border rounded px-2 py-1 text-sm">
        <option v-for="opt in layoutOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
    <!-- Print Area -->
    <div class="mx-auto max-w-4xl">
      <component
        :is="selectedLayout === 'a4' ? PrintA4 : Print80mm"
        :invoice="{
          ...invoice,
          companyName: settings?.company.name,
          companyAddress: settings?.company.address,
          companyPhone: settings?.company.phone,
          companyLogo: settings?.company.logo,
          businessName: settings?.businessName,
        }"
        :customer="{
          name: user?.name || customer?.name,
          email: user?.email || customer?.email,
          address: customer?.address,
          phone: customer?.phone,
          district: customer?.district,
        }"
        :formatCurrency="formatCurrency"
        :formatDate="formatDate"
      />
    </div>
  </div>
  <div v-else class="flex flex-col items-center justify-center min-h-screen text-center">
    <Icon name="lucide:alert-triangle" class="h-12 w-12 text-red-400 mb-4" />
    <h2 class="text-xl font-bold mb-2">Invoice Not Found</h2>
    <p class="text-gray-600 mb-4">The invoice you are looking for does not exist or has been deleted.</p>
    <NuxtLink to="/invoices" class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all">
      <Icon name="lucide:arrow-left" class="h-4 w-4" />
      Back to Invoices
    </NuxtLink>
  </div>
</template>

<style scoped>
@media print {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body,
  html,
  #__nuxt,
  div {
    background: white !important;
    color: black !important;
  }

  /* Hide non-print elements */
  .sticky {
    display: none !important;
  }

  /* Print area full width */
  .mx-auto {
    margin: 0 !important;
  }

  .max-w-4xl {
    max-width: 100% !important;
  }

  /* Page breaks */
  @page {
    size: A4;
    margin: 0.5in;
  }

  /* Print friendly spacing */
  .print\:p-0 {
    padding: 0 !important;
  }

  .print\:mb-4 {
    margin-bottom: 1rem !important;
  }

  .print\:text-sm {
    font-size: 0.875rem !important;
  }

  .print\:border {
    border: 1px solid #000 !important;
  }

  .print\:text-xs {
    font-size: 0.75rem !important;
  }

  /* Table printing */
  table {
    width: 100% !important;
    border-collapse: collapse !important;
  }

  th,
  td {
    border: 1px solid #ddd !important;
    padding: 8px !important;
    text-align: left !important;
  }

  th {
    background-color: #f5f5f5 !important;
    font-weight: bold !important;
  }

  /* Remove shadows and background colors for print */
  .shadow-sm {
    box-shadow: none !important;
  }

  .bg-gray-50,
  .bg-gray-100,
  .bg-gray-900,
  .bg-white {
    background-color: white !important;
  }

  .bg-orange-100,
  .bg-blue-100,
  .bg-green-100 {
    background-color: white !important;
    border: 1px solid #666 !important;
  }

  /* Keep text colors readable */
  .text-gray-900,
  .text-gray-600,
  .text-gray-500 {
    color: #000 !important;
  }

  .text-white {
    color: #000 !important;
  }
}
</style>
