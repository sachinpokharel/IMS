<script setup lang="ts">
import type { Order } from '~/composables/useOrders';
import type { Shipment } from '~/composables/useNCM';

const route = useRoute();
const router = useRouter();
const { fetchOrder, updateOrder, deleteOrder } = useOrders();
const { createShipment, trackShipment, getStatusLabel, getStatusColor: getShipmentStatusColorHelper } = useNCM();
const toast = useToast();

const order = ref<Order | null>(null);
const shipment = ref<Shipment | null>(null);
const loading = ref(true);
const saving = ref(false);
const showEditModal = ref(false);
const showNCMModal = ref(false);
const ncmLoading = ref(false);

const editForm = reactive({
  status: '',
  paymentStatus: '',
  paymentMethod: '',
  expectedDeliveryDate: '',
  notes: '',
  discountAmount: 0,
  deliveryCharge: 0,
});

onMounted(async () => {
  const id = route.params.id as string;
  try {
    order.value = await fetchOrder(id);
    if (order.value) {
      // Populate edit form
      editForm.status = order.value.status;
      editForm.paymentStatus = order.value.paymentStatus;
      editForm.paymentMethod = order.value.paymentMethod || '';
      editForm.expectedDeliveryDate = (order.value.expectedDeliveryDate 
        ? new Date(order.value.expectedDeliveryDate).toISOString().split('T')[0]
        : '') as string;
      editForm.notes = order.value.notes || '';
      editForm.discountAmount = order.value.discountAmount;
      editForm.deliveryCharge = order.value.deliveryCharge;

      // Load shipment tracking info if exists
      loadShipmentTracking();
    }
  } catch (error) {
    toast.error('Failed to load order');
    router.back();
  } finally {
    loading.value = false;
  }
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
    case 'delivery_failed':
      return 'bg-orange-100 text-orange-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getPaymentStatusColor(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'unpaid':
      return 'bg-gray-100 text-gray-800';
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

async function handleUpdateOrder() {
  if (!order.value) return;

  saving.value = true;
  try {
    await updateOrder(order.value.id, {
      status: editForm.status,
      paymentStatus: editForm.paymentStatus,
      paymentMethod: editForm.paymentMethod || undefined,
      expectedDeliveryDate: editForm.expectedDeliveryDate 
        ? new Date(editForm.expectedDeliveryDate).getTime() 
        : undefined,
      notes: editForm.notes,
      discountAmount: editForm.discountAmount,
      deliveryCharge: editForm.deliveryCharge,
    });
    
    // Reload order
    order.value = await fetchOrder(order.value.id);
    showEditModal.value = false;
    toast.success('Order updated successfully');
  } catch (error) {
    toast.error('Failed to update order');
  } finally {
    saving.value = false;
  }
}

async function handleDeleteOrder() {
  if (!order.value) return;
  
  if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
    return;
  }

  saving.value = true;
  try {
    await deleteOrder(order.value.id);
    toast.success('Order deleted successfully');
    router.push('/orders');
  } catch (error) {
    toast.error('Failed to delete order');
    saving.value = false;
  }
}

async function loadShipmentTracking() {
  if (!order.value) return;
  
  try {
    // Fetch shipment by order ID
    const response = await $fetch<{ success: boolean; data: Shipment }>(`/api/orders/${order.value.id}/shipment`);
    if (response.success && response.data) {
      shipment.value = response.data;
    }
  } catch (error: any) {
    // No shipment exists yet - that's ok
    if (error.statusCode !== 404) {
      console.error('Error loading shipment:', error);
    }
  }
}

async function handleRefreshTracking() {
  if (!shipment.value) return;
  
  ncmLoading.value = true;
  try {
    const data = await trackShipment(shipment.value.trackingId);
    shipment.value = data.shipment;
    
    // Reload order to get updated status
    if (order.value) {
      order.value = await fetchOrder(order.value.id);
    }
    
    toast.success('Tracking information updated');
  } catch (error) {
    toast.error('Failed to refresh tracking');
  } finally {
    ncmLoading.value = false;
  }
}

function getShipmentStatusColor(status: string) {
  const color = getShipmentStatusColorHelper(status);
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

async function handleShipmentCreated(shipmentId: string, trackingId: string) {
  toast.success(`Shipment created: ${trackingId}`);
  // Reload shipment and order
  await loadShipmentTracking();
  if (order.value) {
    order.value = await fetchOrder(order.value.id);
  }
}
</script>

<template>
  <div v-if="!loading && order" class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between border-b border-gray-200 pb-4">
      <div>
        <div class="flex items-center gap-3">
          <button
            @click="router.back()"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon name="lucide:arrow-left" class="h-5 w-5" />
          </button>
          <div>
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
              {{ order.orderNumber }}
            </h1>
            <div class="mt-1 flex items-center gap-2">
              <span
                :class="[
                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  getStatusColor(order.status),
                ]"
              >
                {{ order.status }}
              </span>
              <span
                :class="[
                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  getPaymentStatusColor(order.paymentStatus),
                ]"
              >
                {{ order.paymentStatus }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <NCMBookingButton
          v-if="!shipment && order && (order.status === 'confirmed' || order.status === 'pending')"
          :order="order"
          @shipment-created="handleShipmentCreated"
        />
        <NuxtLink
          v-if="order.status === 'confirmed' || order.status === 'processing' || order.status === 'completed'"
          :to="`/orders/print/${order.id}`"
          class="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-all"
        >
          <Icon name="lucide:printer" class="h-4 w-4" />
          Print Receipt
        </NuxtLink>
        <button
          @click="showEditModal = true"
          class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-all"
        >
          <Icon name="lucide:edit" class="h-4 w-4" />
          Edit Order
        </button>
        <button
          @click="handleDeleteOrder"
          :disabled="saving"
          class="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-all"
        >
          <Icon name="lucide:trash-2" class="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>

    <!-- Order Info -->
    <div class="grid gap-6 md:grid-cols-2">
      <!-- Customer Info -->
      <div class="rounded-lg border border-gray-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-500">Name</p>
            <p class="font-medium text-gray-900">{{ order.customer?.name }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Phone</p>
            <p class="font-medium text-gray-900">{{ order.customer?.phone }}</p>
          </div>
          <div v-if="order.customer?.address">
            <p class="text-sm text-gray-500">Address</p>
            <p class="font-medium text-gray-900">{{ order.customer.address }}</p>
          </div>
        </div>
      </div>

      <!-- Order Details -->
      <div class="rounded-lg border border-gray-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-500">Order Date</p>
            <p class="font-medium text-gray-900">{{ formatDate(order.orderDate) }}</p>
          </div>
          <div v-if="order.expectedDeliveryDate">
            <p class="text-sm text-gray-500">Expected Delivery</p>
            <p class="font-medium text-gray-900">{{ formatDate(order.expectedDeliveryDate) }}</p>
          </div>
          <div v-if="order.paymentMethod">
            <p class="text-sm text-gray-500">Payment Method</p>
            <p class="font-medium text-gray-900">{{ order.paymentMethod.replace('_', ' ').toUpperCase() }}</p>
          </div>
          <div v-if="order.notes">
            <p class="text-sm text-gray-500">Notes</p>
            <p class="font-medium text-gray-900">{{ order.notes }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- NCM Delivery Tracking (if shipment exists) -->
    <div v-if="shipment" class="rounded-lg border border-gray-200 bg-white p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <Icon name="lucide:truck" class="h-5 w-5 text-blue-600" />
          <h2 class="text-lg font-semibold text-gray-900">Delivery Tracking</h2>
        </div>
        <button
          @click="handleRefreshTracking"
          :disabled="ncmLoading"
          class="inline-flex items-center gap-2 rounded-md bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50 transition-colors"
        >
          <Icon name="lucide:refresh-cw" :class="['h-4 w-4', ncmLoading && 'animate-spin']" />
          Refresh
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-3 mb-6">
        <div>
          <p class="text-sm text-gray-500">Tracking ID</p>
          <p class="font-mono font-medium text-gray-900">{{ shipment.trackingId }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Status</p>
          <span
            :class="[
              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
              getShipmentStatusColor(shipment.systemStatus),
            ]"
          >
            {{ getStatusLabel(shipment.systemStatus) }}
          </span>
        </div>
        <div>
          <p class="text-sm text-gray-500">Destination</p>
          <p class="font-medium text-gray-900">{{ shipment.destinationCity }}</p>
        </div>
        <div v-if="shipment.codAmount > 0">
          <p class="text-sm text-gray-500">COD Amount</p>
          <p class="font-medium text-gray-900">{{ formatCurrency(shipment.codAmount) }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Shipping Charge</p>
          <p class="font-medium text-gray-900">{{ formatCurrency(shipment.shippingCharge) }}</p>
        </div>
      </div>

      <!-- Tracking Timeline -->
      <div v-if="shipment.events && shipment.events.length > 0" class="border-t border-gray-200 pt-4">
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Tracking History</h3>
        <div class="space-y-3">
          <div
            v-for="(event, index) in shipment.events"
            :key="event.id"
            class="flex gap-3"
          >
            <div class="flex flex-col items-center">
              <div
                :class="[
                  'h-2 w-2 rounded-full',
                  index === 0 ? 'bg-blue-600' : 'bg-gray-400',
                ]"
              ></div>
              <div
                v-if="index < shipment.events.length - 1"
                class="w-0.5 flex-1 bg-gray-300 mt-1"
              ></div>
            </div>
            <div class="flex-1 pb-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-900">
                    {{ getStatusLabel(event.systemStatus) }}
                  </p>
                  <p class="text-xs text-gray-500 mt-0.5">
                    {{ event.partnerStatus }}
                  </p>
                  <p v-if="event.location" class="text-xs text-gray-500 mt-0.5">
                    <Icon name="lucide:map-pin" class="h-3 w-3 inline" />
                    {{ event.location }}
                  </p>
                </div>
                <span class="text-xs text-gray-500">
                  {{ formatDate(event.occurredAt || event.createdAt) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Items -->
    <div class="rounded-lg border border-gray-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Price
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tax
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="item in order.items" :key="item.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ item.product?.name }}
                  <span v-if="item.variant" class="text-gray-500">({{ item.variant.name }})</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                {{ item.quantity }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {{ formatCurrency(item.unitPrice) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                {{ formatCurrency(item.taxAmount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                {{ formatCurrency(item.lineTotal) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary -->
      <div class="mt-6 border-t border-gray-200 pt-4">
        <div class="flex justify-end">
          <div class="w-64 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Subtotal</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(order.subtotal) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Tax</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(order.taxAmount) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Discount</span>
              <span class="font-medium text-red-600">-{{ formatCurrency(order.discountAmount) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Delivery Charge</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(order.deliveryCharge) }}</span>
            </div>
            <div class="pt-2 border-t border-gray-200 flex justify-between">
              <span class="text-lg font-semibold text-gray-900">Total</span>
              <span class="text-lg font-bold text-blue-600">{{ formatCurrency(order.totalAmount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <Modal
      v-if="showEditModal"
      @close="showEditModal = false"
      title="Edit Order"
      size="lg"
    >
      <form @submit.prevent="handleUpdateOrder" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              v-model="editForm.status"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="delivery_failed">Delivery Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              v-model="editForm.paymentStatus"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              v-model="editForm.paymentMethod"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select Method</option>
              <option value="cash_on_delivery">Cash on Delivery</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
            <input
              v-model="editForm.expectedDeliveryDate"
              type="date"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
            <input
              v-model.number="editForm.discountAmount"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Charge</label>
            <input
              v-model.number="editForm.deliveryCharge"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              v-model="editForm.notes"
              rows="3"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            ></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4">
          <button
            @click="showEditModal = false"
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>

  <div v-else-if="loading" class="flex items-center justify-center h-64">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
</template>
