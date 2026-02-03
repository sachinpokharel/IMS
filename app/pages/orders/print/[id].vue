<script setup lang="ts">
import PrintOrderA4 from '~/components/print-paper/PrintOrderA4.vue';
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useOrders } from '~/composables/useOrders';
import { useSettings } from '~/composables/useSettings';

const route = useRoute();
const router = useRouter();
const { fetchOrder } = useOrders();
const { settings } = useSettings();

const order = ref<any>(null);
const customer = ref<any>(null);
const loading = ref(true);

onMounted(async () => {
  const id = route.params.id as string;
  try {
    order.value = await fetchOrder(id);
    customer.value = order.value?.customer;
  } catch (error) {
    console.error('Failed to load order');
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
  <div v-else-if="order" class="bg-white">
    <div v-if="!isPrint" data-no-print class="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex gap-3">
      <button
        @click="handlePrint"
        class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
      >
        <Icon name="lucide:printer" class="h-4 w-4" />
        Print Receipt
      </button>
      <NuxtLink
        :to="`/orders/${order?.id}`"
        class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 transition-all"
      >
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
        Back to Order
      </NuxtLink>
    </div>
    <!-- Print Area -->
    <div class="mx-auto max-w-4xl">
      <PrintOrderA4
        :order="{
          ...order,
          companyName: settings?.company?.name || settings?.businessName,
          companyAddress: settings?.company?.address,
          companyPhone: settings?.company?.phone,
          companyLogo: settings?.company?.logo,
        }"
        :customer="customer"
        :formatCurrency="formatCurrency"
        :formatDate="formatDate"
      />
    </div>
  </div>
  <div v-else class="flex flex-col items-center justify-center min-h-screen text-center">
    <Icon name="lucide:alert-triangle" class="h-12 w-12 text-red-400 mb-4" />
    <h2 class="text-xl font-bold mb-2">Order Not Found</h2>
    <p class="text-gray-600 mb-4">The order you are looking for does not exist or has been deleted.</p>
    <NuxtLink to="/orders" class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all">
      <Icon name="lucide:arrow-left" class="h-4 w-4" />
      Back to Orders
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
  .sticky,
  [data-no-print] {
    display: none !important;
  }

  /* Print area full width */
  .mx-auto {
    margin: 0 !important;
  }

  .max-w-4xl {
    max-width: 100% !important;
  }
}
</style>
