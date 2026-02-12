<script setup lang="ts">
import type { Customer } from '~/composables/useCustomers';
import { NEPAL_DISTRICTS } from '~~/server/utils/nepal-districts';

const router = useRouter();
const { customers, fetchCustomers, createCustomer } = useCustomers();
const { createOrder } = useOrders();
const toast = useToast();

const loading = ref(true);
const saving = ref(false);
const showNewCustomerModal = ref(false);
const creatingCustomer = ref(false);
const customerSearchQuery = ref('');
const showCustomerDropdown = ref(false);

const phoneError = ref('');
const secondaryPhoneError = ref('');

const newCustomerForm = reactive({
  name: '',
  phone: '',
  secondaryPhone: '',
  street: '',
  district: '',
  deliveryCharge: 0,
  babyName: '',
  babyDate: '',
  babyGender: '',
  notes: '',
});

const form = reactive({
  customerId: '',
  items: [
    {
      productId: '',
      variantId: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0,
    },
  ],
  discountAmount: 0,
  deliveryCharge: 0,
  expectedDeliveryDate: '',
  notes: '',
  paymentMethod: 'cash_on_delivery',
  status: 'pending',
});

const products = ref<any[]>([]);
const selectedCustomer = computed(() =>
  customers.value?.find((c) => c.id === form.customerId)
);

const filteredCustomers = computed(() => {
  if (!customerSearchQuery.value.trim()) return customers.value;
  
  const query = customerSearchQuery.value.toLowerCase();
  return customers.value.filter((customer) => {
    const matchesName = customer.name.toLowerCase().includes(query);
    const matchesPhone = customer.phone.toLowerCase().includes(query);
    const matchesSecondaryPhone = customer.secondaryPhone?.toLowerCase().includes(query);
    const matchesId = customer.id.toLowerCase().includes(query);
    
    return matchesName || matchesPhone || matchesSecondaryPhone || matchesId;
  });
});

function selectCustomer(customerId: string) {
  form.customerId = customerId;
  customerSearchQuery.value = '';
  showCustomerDropdown.value = false;
  
  const customer = customers.value.find(c => c.id === customerId);
  if (customer && customer.deliveryCharge) {
    form.deliveryCharge = customer.deliveryCharge;
  }
}

function clearCustomerSelection() {
  form.customerId = '';
  customerSearchQuery.value = '';
  showCustomerDropdown.value = false;
}

function closeDropdownDelayed() {
  setTimeout(() => {
    showCustomerDropdown.value = false;
  }, 100);
}

function validatePhone(phone: string) {
  if (!phone) {
    phoneError.value = 'Phone is required';
    return false;
  }

  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length !== 10) {
    phoneError.value = 'Phone number must be exactly 10 digits';
    return false;
  }

  phoneError.value = '';
  return true;
}

function validateSecondaryPhone(secondary: string, primary: string) {
  if (!secondary) {
    secondaryPhoneError.value = '';
    return true;
  }

  if (secondary === primary) {
    secondaryPhoneError.value = 'Secondary phone must be different from primary phone';
    return false;
  }

  const digitsOnly = secondary.replace(/\D/g, '');
  if (digitsOnly.length !== 10) {
    secondaryPhoneError.value = 'Phone number must be exactly 10 digits';
    return false;
  }

  secondaryPhoneError.value = '';
  return true;
}

onMounted(async () => {
  try {
    await fetchCustomers();
    const res = await $fetch('/api/products') as any;
    products.value = Array.isArray(res) ? res : (res.data || []);
  } catch (error) {
    toast.error('Failed to load data');
  } finally {
    loading.value = false;
  }
});

function getProductVariants(productId: string) {
  const product = products.value.find((p) => p.id === productId);
  return product?.variants || [];
}

function getAvailableStock(productId: string, variantId?: string, currentItemIndex?: number) {
  const product = products.value.find((p) => p.id === productId);
  if (!product) return 0;
  
  let totalStock = 0;
  if (variantId) {
    const variant = product.variants?.find((v: any) => v.id === variantId);
    totalStock = variant?.stockQuantity || 0;
  } else {
    totalStock = product.stockQuantity || 0;
  }
  
  const allocatedQuantity = form.items.reduce((sum, item, index) => {
    if (currentItemIndex !== undefined && index === currentItemIndex) return sum;
    const sameProduct = item.productId === productId;
    const sameVariant = variantId ? item.variantId === variantId : !item.variantId;
    if (sameProduct && sameVariant) {
      return sum + (item.quantity || 0);
    }
    return sum;
  }, 0);
  
  return Math.max(0, totalStock - allocatedQuantity);
}

function updateUnitPrice(itemIndex: number) {
  const item = form.items[itemIndex];
  if (!item) return;
  const product = products.value.find((p) => p.id === item.productId);
  if (product) {
    item.unitPrice = product.sellingPrice || 0;
  }
}

function isDuplicateProduct(productId: string, variantId: string | undefined, currentItemIndex: number) {
  return form.items.some((item, index) => {
    if (index === currentItemIndex) return false;
    return item.productId === productId && item.variantId === variantId;
  });
}

function validateProductSelection(itemIndex: number) {
  const item = form.items[itemIndex];
  if (!item || !item.productId) return true;
  
  if (isDuplicateProduct(item.productId, item.variantId, itemIndex)) {
    const product = products.value.find((p) => p.id === item.productId);
    const variant = item.variantId 
      ? product?.variants?.find((v: any) => v.id === item.variantId)?.name 
      : 'default';
    toast.error(`${product?.name || 'Product'} ${variant !== 'default' ? `(${variant})` : ''} is already added to this order`);
    item.productId = '';
    item.variantId = '';
    item.unitPrice = 0;
    return false;
  }
  return true;
}

async function handleCreateCustomer() {
  if (!newCustomerForm.name.trim()) {
    toast.error('❌ Customer name is required');
    return;
  }

  if (!validatePhone(newCustomerForm.phone)) {
    toast.error('❌ ' + phoneError.value);
    return;
  }

  if (newCustomerForm.secondaryPhone && !validateSecondaryPhone(newCustomerForm.secondaryPhone, newCustomerForm.phone)) {
    toast.error('❌ ' + secondaryPhoneError.value);
    return;
  }

  creatingCustomer.value = true;
  try {
    const customer = await createCustomer({
      name: newCustomerForm.name,
      phone: newCustomerForm.phone,
      secondaryPhone: newCustomerForm.secondaryPhone || undefined,
      street: newCustomerForm.street || undefined,
      district: newCustomerForm.district || undefined,
      deliveryCharge: newCustomerForm.deliveryCharge || 0,
      babyName: newCustomerForm.babyName || undefined,
      babyDate: newCustomerForm.babyDate ? new Date(newCustomerForm.babyDate).getTime() : undefined,
      babyGender: newCustomerForm.babyGender || undefined,
      notes: newCustomerForm.notes || undefined,
    });

    form.customerId = customer.id;
    
    Object.assign(newCustomerForm, {
      name: '',
      phone: '',
      secondaryPhone: '',
      street: '',
      district: '',
      deliveryCharge: 0,
      babyName: '',
      babyDate: '',
      babyGender: '',
      notes: '',
    });
    
    showNewCustomerModal.value = false;
    toast.success(`Customer "${customer.name}" created successfully`);
  } catch (error) {
    toast.error('Failed to create customer');
  } finally {
    creatingCustomer.value = false;
  }
}

function validateStock(itemIndex: number) {
  const item = form.items[itemIndex];
  if (!item || !item.productId) return true;
  
  const availableStock = getAvailableStock(item.productId, item.variantId, itemIndex);
  if (item.quantity > availableStock) {
    const product = products.value.find((p) => p.id === item.productId);
    toast.warning(`Note: Only ${availableStock} units in stock for ${product?.name || 'this product'}`);
  }
  return true;
}

function addItem() {
  form.items.push({
    productId: '',
    variantId: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
  });
}

function removeItem(index: number) {
  if (form.items.length > 1) {
    form.items.splice(index, 1);
  }
}

function calculateLineTotal(item: any) {
  const subtotal = item.quantity * item.unitPrice;
  const tax = subtotal * (item.taxRate / 100);
  return subtotal + tax;
}

const subtotal = computed(() => {
  return form.items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0);
});

const totalTax = computed(() => {
  return form.items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    return sum + itemSubtotal * (item.taxRate / 100);
  }, 0);
});

const totalAmount = computed(() => {
  return subtotal.value + totalTax.value - (form.discountAmount || 0) + (form.deliveryCharge || 0);
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
  }).format(amount);
}

async function handleSubmit() {
  if (!form.customerId) {
    toast.error('⚠️ Please select a customer');
    return;
  }

  for (let i = 0; i < form.items.length; i++) {
    const item = form.items[i];
    if (!item) continue;
    
    if (!item.productId) {
      toast.error(`❌ Item ${i + 1}: Please select a product`);
      return;
    }
    
    if (!item.quantity || item.quantity <= 0) {
      toast.error(`❌ Item ${i + 1}: Quantity must be greater than 0`);
      return;
    }
    
    if (!item.unitPrice || item.unitPrice <= 0) {
      toast.error(`❌ Item ${i + 1}: Unit price must be greater than 0`);
      return;
    }
  }

  saving.value = true;
  try {
    const orderData = {
      customerId: form.customerId,
      items: form.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      })),
      discountAmount: form.discountAmount || 0,
      deliveryCharge: form.deliveryCharge || 0,
      expectedDeliveryDate: form.expectedDeliveryDate ? new Date(form.expectedDeliveryDate).getTime() : undefined,
      notes: form.notes,
      paymentMethod: form.paymentMethod,
      status: form.status,
    };

    const result = await createOrder(orderData);
    toast.success('Order created successfully');
    router.push(`/orders/${result.id}`);
  } catch (error) {
    toast.error('Failed to create order');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-if="!loading" class="space-y-6">
    <!-- Header -->
    <div class="border-b border-gray-200 pb-4">
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
        Create New Order
      </h1>
      <p class="mt-1 text-sm text-gray-500">
        Create customer orders without affecting inventory.
      </p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Customer Selection -->
      <div class="rounded-lg border border-gray-200 bg-white p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Customer</h2>
          <button
            @click="showNewCustomerModal = true"
            type="button"
            class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all"
          >
            <Icon name="lucide:plus" class="h-4 w-4" />
            New Customer
          </button>
        </div>

        <div class="relative">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Search & Select Customer <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <div v-if="selectedCustomer && !showCustomerDropdown" class="flex items-center gap-2 bg-gray-50 rounded-md border border-gray-300 px-4 py-2.5">
              <div class="flex-1">
                <p class="font-medium text-gray-900">{{ selectedCustomer.name }}</p>
                <p class="text-xs text-gray-600">{{ selectedCustomer.phone }} {{ selectedCustomer.secondaryPhone ? `• ${selectedCustomer.secondaryPhone}` : '' }}</p>
              </div>
              <button
                @click="clearCustomerSelection"
                type="button"
                class="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Icon name="lucide:x" class="h-4 w-4" />
              </button>
            </div>

            <input
              v-else
              v-model="customerSearchQuery"
              @focus="showCustomerDropdown = true"
              @focusout="closeDropdownDelayed"
              @keydown.escape="showCustomerDropdown = false"
              type="text"
              placeholder="Search by name, phone, or ID..."
              class="w-full rounded-md border border-gray-300 px-4 py-2.5 focus:outline-none focus:border-blue-500"
            />

            <div
              v-if="showCustomerDropdown && filteredCustomers.length > 0"
              class="absolute top-full left-0 right-0 mt-1 bg-white rounded-md border border-gray-300 shadow-lg z-10 max-h-64 overflow-y-auto"
            >
              <div
                v-for="customer in filteredCustomers"
                :key="customer.id"
                @mousedown.prevent="selectCustomer(customer.id)"
                class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <p class="font-medium text-gray-900">{{ customer.name }}</p>
                <p class="text-xs text-gray-600">
                  📱 {{ customer.phone }} {{ customer.secondaryPhone ? `• ${customer.secondaryPhone}` : '' }}
                </p>
              </div>
            </div>

            <div
              v-else-if="showCustomerDropdown && customerSearchQuery.trim() && filteredCustomers.length === 0"
              class="absolute top-full left-0 right-0 mt-1 bg-white rounded-md border border-gray-300 shadow-lg z-10 p-4 text-center text-sm text-gray-600"
            >
              No customers found.
            </div>
          </div>
        </div>

        <div v-if="selectedCustomer" class="mt-4 pt-4 border-t border-gray-200">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</p>
              <p class="text-gray-900">{{ selectedCustomer.address || '-' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">District</p>
              <p class="text-gray-900">{{ selectedCustomer.district || '-' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Items -->
      <div class="rounded-lg border border-gray-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>

        <div class="space-y-4">
          <div
            v-for="(item, index) in form.items"
            :key="index"
            class="rounded-lg border border-gray-200 p-4 space-y-4"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-gray-700">Item {{ index + 1 }}</span>
              <button
                v-if="form.items.length > 1"
                @click="removeItem(index)"
                type="button"
                class="text-red-500 hover:text-red-700 transition-colors"
              >
                <Icon name="lucide:trash-2" class="h-4 w-4" />
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Product <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="item.productId"
                  @change="updateUnitPrice(index); validateProductSelection(index)"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select a product</option>
                  <option
                    v-for="product in products"
                    :key="product.id"
                    :value="product.id"
                  >
                    {{ product.name }} - {{ formatCurrency(product.sellingPrice || 0) }}
                  </option>
                </select>
              </div>

              <div v-if="getProductVariants(item.productId).length > 0">
                <label class="block text-sm font-medium text-gray-700 mb-1">Variant</label>
                <select
                  v-model="item.variantId"
                  @change="validateProductSelection(index)"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Default</option>
                  <option
                    v-for="variant in getProductVariants(item.productId)"
                    :key="variant.id"
                    :value="variant.id"
                  >
                    {{ variant.name }} - {{ formatCurrency(variant.price || 0) }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="item.quantity"
                  @change="validateStock(index)"
                  type="number"
                  min="1"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="item.unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input
                  v-model.number="item.taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Line Total</label>
                <input
                  :value="formatCurrency(calculateLineTotal(item))"
                  type="text"
                  readonly
                  class="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                />
              </div>
            </div>
          </div>

          <button
            @click="addItem"
            type="button"
            class="w-full flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-all"
          >
            <Icon name="lucide:plus" class="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      <!-- Order Details -->
      <div class="rounded-lg border border-gray-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              v-model="form.status"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              v-model="form.paymentMethod"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="cash_on_delivery">Cash on Delivery</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
            <input
              v-model="form.expectedDeliveryDate"
              type="date"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
            <input
              v-model.number="form.discountAmount"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Charge</label>
            <input
              v-model.number="form.deliveryCharge"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              v-model="form.notes"
              rows="3"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
              placeholder="Additional notes..."
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="rounded-lg border border-gray-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Summary</h2>

        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Subtotal</span>
            <span class="font-medium text-gray-900">{{ formatCurrency(subtotal) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Tax</span>
            <span class="font-medium text-gray-900">{{ formatCurrency(totalTax) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Discount</span>
            <span class="font-medium text-red-600">-{{ formatCurrency(form.discountAmount || 0) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Delivery Charge</span>
            <span class="font-medium text-gray-900">{{ formatCurrency(form.deliveryCharge || 0) }}</span>
          </div>
          <div class="pt-2 border-t border-gray-200 flex justify-between">
            <span class="text-lg font-semibold text-gray-900">Total</span>
            <span class="text-lg font-bold text-blue-600">{{ formatCurrency(totalAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3">
        <button
          @click="router.push('/orders')"
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          {{ saving ? 'Creating...' : 'Create Order' }}
        </button>
      </div>
    </form>

    <!-- New Customer Modal -->
    <UiModal
      v-model:open="showNewCustomerModal"
      title="Add New Customer"
      size="lg"
    >
      <form @submit.prevent="handleCreateCustomer" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Name <span class="text-red-500">*</span>
            </label>
            <UiInput v-model="newCustomerForm.name" required />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Phone <span class="text-red-500">*</span>
            </label>
            <UiInput
              v-model="newCustomerForm.phone"
              type="tel"
              required
              :error="phoneError"
              @blur="validatePhone(newCustomerForm.phone)"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Secondary Phone</label>
            <UiInput
              v-model="newCustomerForm.secondaryPhone"
              type="tel"
              :error="secondaryPhoneError"
              @blur="validateSecondaryPhone(newCustomerForm.secondaryPhone, newCustomerForm.phone)"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Street</label>
            <UiInput v-model="newCustomerForm.street" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">District</label>
            <select
              v-model="newCustomerForm.district"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select District</option>
              <option v-for="district in NEPAL_DISTRICTS" :key="district" :value="district">
                {{ district }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Charge</label>
            <UiInput v-model.number="newCustomerForm.deliveryCharge" type="number" step="0.01" />
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              v-model="newCustomerForm.notes"
              rows="2"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
            ></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4">
          <button
            @click="showNewCustomerModal = false"
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="creatingCustomer"
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {{ creatingCustomer ? 'Creating...' : 'Create Customer' }}
          </button>
        </div>
      </form>
    </UiModal>
  </div>

  <div v-else class="flex items-center justify-center h-64">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
</template>
