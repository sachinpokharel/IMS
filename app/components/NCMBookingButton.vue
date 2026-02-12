<script setup lang="ts">
import type { Order } from '~/composables/useOrders';

const props = defineProps<{
  order: Order;
}>();

const emit = defineEmits<{
  (e: 'shipmentCreated', shipmentId: string, trackingId: string): void;
}>();

const { fetchCities, getShippingCost, createShipment } = useNCM();
const toast = useToast();

const cities = ref<any[]>([]);
const selectedCity = ref('');
const shippingRate = ref<any>(null);
const loading = ref(false);
const creating = ref(false);
const showModal = ref(false);

onMounted(async () => {
  try {
    cities.value = await fetchCities();
  } catch (error) {
    toast.error('Failed to load cities');
  }
});

watch(selectedCity, async (newCity) => {
  if (!newCity) {
    shippingRate.value = null;
    return;
  }

  loading.value = true;
  try {
    shippingRate.value = await getShippingCost(newCity);
  } catch (error) {
    toast.error('Failed to fetch shipping cost');
    shippingRate.value = null;
  } finally {
    loading.value = false;
  }
});

async function handleCreateShipment() {
  if (!selectedCity.value) {
    toast.error('Please select a destination city');
    return;
  }

  creating.value = true;
  try {
    const result = await createShipment({
      orderId: props.order.id,
      destinationCity: selectedCity.value,
    });

    toast.success('NCM shipment created successfully');
    emit('shipmentCreated', result.shipmentId, result.trackingId);
    showModal.value = false;
  } catch (error: any) {
    const message = error.data?.statusMessage || 'Failed to create shipment';
    toast.error(message);
  } finally {
    creating.value = false;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getCODAmount() {
  if (props.order.paymentMethod !== 'cash_on_delivery') {
    return 0;
  }
  return props.order.totalAmount;
}
</script>

<template>
  <div>
    <button
      @click="showModal = true"
      class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-all"
    >
      <Icon name="lucide:truck" class="h-4 w-4" />
      Book NCM Delivery
    </button>

    <UiModal
      v-model:open="showModal"
      title="Book NCM Delivery"
      size="md"
    >
      <div class="space-y-4">
        <!-- Order Info -->
        <div class="bg-gray-50 rounded-lg p-4 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Order Number</span>
            <span class="font-medium text-gray-900">{{ order.orderNumber }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Customer</span>
            <span class="font-medium text-gray-900">{{ order.customer?.name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Phone</span>
            <span class="font-medium text-gray-900">{{ order.customer?.phone }}</span>
          </div>
          <div v-if="order.paymentMethod === 'cash_on_delivery'" class="flex justify-between text-sm border-t border-gray-200 pt-2">
            <span class="text-gray-600">COD Amount</span>
            <span class="font-bold text-blue-600">{{ formatCurrency(getCODAmount()) }}</span>
          </div>
        </div>

        <!-- Destination City -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Destination City <span class="text-red-500">*</span>
          </label>
          <select
            v-model="selectedCity"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            :disabled="cities.length === 0"
          >
            <option value="">Select City</option>
            <option
              v-for="city in cities"
              :key="city.id || city.name"
              :value="city.name || city.id"
            >
              {{ city.name || city.id }}
            </option>
          </select>
          <p v-if="cities.length === 0" class="text-xs text-gray-500 mt-1">
            Loading cities...
          </p>
        </div>

        <!-- Shipping Cost -->
        <div v-if="shippingRate" class="bg-blue-50 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Shipping Charge</p>
              <p class="text-lg font-bold text-blue-600">
                {{ formatCurrency(shippingRate.charge || 0) }}
              </p>
            </div>
            <Icon name="lucide:truck" class="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            @click="showModal = false"
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="handleCreateShipment"
            :disabled="!selectedCity || creating"
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {{ creating ? 'Creating...' : 'Book Delivery' }}
          </button>
        </div>
      </div>
    </UiModal>
  </div>
</template>
