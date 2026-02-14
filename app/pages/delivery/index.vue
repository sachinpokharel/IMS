<script setup lang="ts">
const { data: config, pending: configPending } = await useFetch('/api/ncm/config');
const { data: shipments, pending: shipmentsPending, refresh: refreshShipments } = await useFetch<any[]>('/api/ncm/shipments');
const { getStatusLabel, getStatusColor } = useNCM();

const stats = computed(() => {
  if (!shipments.value) return { total: 0, delivered: 0, inTransit: 0, failed: 0 };
  
  return {
    total: shipments.value.length,
    delivered: shipments.value.filter(s => s.systemStatus === 'DELIVERED').length,
    inTransit: shipments.value.filter(s => ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.systemStatus)).length,
    failed: shipments.value.filter(s => s.systemStatus === 'DELIVERY_FAILED').length
  };
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getShipmentStatusColorClass(status: string) {
  const color = getStatusColor(status);
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
  };
  return colors[color] || colors.gray;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          Delivery Partner
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          Manage and monitor your Nepal Can Move (NCM) delivery integration.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="config?.apiKeySet" class="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          <span class="h-1.5 w-1.5 rounded-full bg-green-600"></span>
          Connected to NCM
        </span>
        <span v-else class="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          <span class="h-1.5 w-1.5 rounded-full bg-red-600"></span>
          Not Configured
        </span>
      </div>
    </div>

    <!-- Integration Info / Setup -->
    <div class="grid gap-6 md:grid-cols-12">
      <div class="md:col-span-8 space-y-6">
        <!-- Setup Guide -->
        <div v-if="!config?.apiKeySet" class="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <div class="flex items-start gap-3">
            <Icon name="lucide:info" class="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 class="text-lg font-semibold text-blue-900">Setup Required</h3>
              <p class="mt-2 text-sm text-blue-700">
                To start booking deliveries with Nepal Can Move, you need to configure your API credentials.
              </p>
              <div class="mt-4 space-y-3">
                <div class="flex items-start gap-2">
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
                  <p class="text-sm text-blue-800">Get your API Key from the NCM Partner Portal.</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">2</span>
                  <p class="text-sm text-blue-800">Add the following variables to your <code class="bg-blue-100 px-1 rounded">.env</code> file:</p>
                </div>
                <pre class="mt-2 overflow-x-auto rounded-md bg-blue-900 px-4 py-3 text-xs text-blue-50 font-mono">
NUXT_NCM_API_KEY=your_api_key_here
NUXT_NCM_API_URL=https://portal.nepalcanmove.com/api/v1
NUXT_NCM_ORIGIN_BRANCH=BIRGUNJ</pre>
                <div class="flex items-start gap-2">
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">3</span>
                  <p class="text-sm text-blue-800">Restart the application to apply changes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid gap-4 sm:grid-cols-4">
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Shipments</p>
            <p class="mt-1 text-xl font-bold text-gray-900">{{ stats.total }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivered</p>
            <p class="mt-1 text-xl font-bold text-green-600">{{ stats.delivered }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">In Transit</p>
            <p class="mt-1 text-xl font-bold text-blue-600">{{ stats.inTransit }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Failed</p>
            <p class="mt-1 text-xl font-bold text-red-600">{{ stats.failed }}</p>
          </div>
        </div>

        <!-- Shipments Table -->
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 class="font-semibold text-gray-900">Recent Shipments</h3>
            <button @click="() => refreshShipments()" class="text-sm text-blue-600 hover:text-blue-800 font-medium">Refresh</button>
          </div>
          <div v-if="shipments && shipments.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking ID</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">COD Amount</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="shipment in shipments" :key="shipment.id" class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <NuxtLink :to="`/orders/${shipment.orderId}`" class="text-sm font-mono font-medium text-blue-600 hover:underline">
                      {{ shipment.trackingId }}
                    </NuxtLink>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <NuxtLink :to="`/orders/${shipment.orderId}`" class="text-sm text-gray-900 hover:underline">
                      {{ shipment.order?.orderNumber }}
                    </NuxtLink>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{{ shipment.recipientName }}</div>
                    <div class="text-xs text-gray-500">{{ shipment.destinationCity }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="['inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', getShipmentStatusColorClass(shipment.systemStatus)]">
                      {{ getStatusLabel(shipment.systemStatus) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {{ shipment.codAmount > 0 ? formatCurrency(shipment.codAmount) : '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {{ formatDate(shipment.createdAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="px-6 py-12 text-center">
            <Icon name="lucide:truck" class="mx-auto h-12 w-12 text-gray-300" />
            <p class="mt-2 text-sm text-gray-500">No shipments found yet.</p>
          </div>
        </div>
      </div>

      <div class="md:col-span-4 space-y-6">
        <!-- Active Configuration -->
        <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 class="flex items-center gap-2 font-semibold text-gray-900 mb-4">
            <Icon name="lucide:settings" class="h-4 w-4 text-gray-400" />
            NCM Configuration
          </h3>
          <div class="space-y-4">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">API Key</p>
              <p class="mt-1 text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1.5 rounded border border-gray-100">{{ config?.apiKeyMasked }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">API Endpoint</p>
              <p class="mt-1 text-sm text-gray-700 truncate" :title="config?.apiUrl">{{ config?.apiUrl }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Origin Branch</p>
              <p class="mt-1 text-sm text-gray-900 font-medium">{{ config?.originBranch }}</p>
            </div>
          </div>
          <div class="mt-6 pt-6 border-t border-gray-100">
            <p class="text-xs text-gray-500">
               NCM integration uses these settings to book shipments and track status automatically. 
               Contact your NCM account manager if you need to update your branch or API key.
            </p>
          </div>
        </div>

        <!-- Quick Help -->
        <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 class="flex items-center gap-2 font-semibold text-gray-900 mb-4">
            <Icon name="lucide:help-circle" class="h-4 w-4 text-gray-400" />
            Quick Links
          </h3>
          <ul class="space-y-3">
             <li>
               <a href="https://portal.nepalcanmove.com" target="_blank" class="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                 <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
                 NCM Partner Portal
               </a>
             </li>
             <li>
               <NuxtLink to="/orders" class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                 <Icon name="lucide:shopping-cart" class="h-3.5 w-3.5" />
                 Open Orders
               </NuxtLink>
             </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
