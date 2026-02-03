<script setup lang="ts">
import type { Customer } from '~/composables/useCustomers';
import { NEPAL_DISTRICTS } from '~~/server/utils/nepal-districts';

const router = useRouter();
const { customers, fetchCustomers, createCustomer } = useCustomers();
const { createInvoice } = useInvoices();
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
  notes: '',
  paymentMethod: 'bank',
  finalize: false,
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
  
  // Auto-populate delivery charge from customer profile
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
    // Fetch products
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
  
  // Subtract quantities already allocated in other items
  const allocatedQuantity = form.items.reduce((sum, item, index) => {
    // Skip the current item we're checking
    if (currentItemIndex !== undefined && index === currentItemIndex) return sum;
    
    // Check if this item uses the same product/variant
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
    if (index === currentItemIndex) return false; // Skip current item
    return item.productId === productId && item.variantId === variantId;
  });
}

function validateProductSelection(itemIndex: number) {
  const item = form.items[itemIndex];
  if (!item.productId) return true;
  
  if (isDuplicateProduct(item.productId, item.variantId, itemIndex)) {
    const product = products.value.find((p) => p.id === item.productId);
    const variant = item.variantId 
      ? product?.variants?.find((v: any) => v.id === item.variantId)?.name 
      : 'default';
    toast.error(`${product?.name || 'Product'} ${variant !== 'default' ? `(${variant})` : ''} is already added to this invoice`);
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

    // Auto-select the new customer
    form.customerId = customer.id;
    
    // Reset form
    newCustomerForm.name = '';
    newCustomerForm.phone = '';
    newCustomerForm.secondaryPhone = '';
    newCustomerForm.street = '';
    newCustomerForm.district = '';
    newCustomerForm.deliveryCharge = 0;
    newCustomerForm.babyName = '';
    newCustomerForm.babyDate = '';
    newCustomerForm.babyGender = '';
    newCustomerForm.notes = '';
    
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
  if (!item.productId) return true;
  
  const availableStock = getAvailableStock(item.productId, item.variantId, itemIndex);
  if (item.quantity > availableStock) {
    const product = products.value.find((p) => p.id === item.productId);
    toast.error(`Only ${availableStock} units available for ${product?.name || 'this product'} (accounting for other items)`);
    item.quantity = Math.max(1, availableStock);
    return false;
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

  // Validate each item
  for (let i = 0; i < form.items.length; i++) {
    const item = form.items[i];
    
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
    
    // Validate stock availability
    const availableStock = getAvailableStock(item.productId, item.variantId, i);
    if (item.quantity > availableStock) {
      const product = products.value.find((p) => p.id === item.productId);
      toast.error(`❌ Item ${i + 1}: ${product?.name || 'Product'} - Only ${availableStock} units available`);
      return;
    }
  }

  saving.value = true;
  try {
    const invoiceData = {
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
      notes: form.notes,
      paymentMethod: form.paymentMethod,
    };

    const result = await createInvoice(invoiceData);
    toast.success(
      form.finalize ? 'Invoice created and finalized' : 'Invoice created as draft'
    );
    router.push(`/invoices/${result.id}`);
  } catch (error) {
    toast.error('Failed to create invoice');
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
        Create New Invoice
      </h1>
      <p class="mt-1 text-sm text-gray-500">
        Create and manage customer invoices.
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

        <!-- Searchable Customer Input -->
        <div class="relative">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Search & Select Customer <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <!-- Display selected customer or search input -->
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

            <!-- Search input when no customer selected or dropdown is open -->
            <input
              v-else
              v-model="customerSearchQuery"
              @focus="showCustomerDropdown = true"
              @blur="setTimeout(() => showCustomerDropdown = false, 200)"
              type="text"
              placeholder="Search by name, phone, or ID..."
              class="w-full rounded-md border border-gray-300 px-4 py-2.5 focus:outline-none focus:border-blue-500"
            />

            <!-- Dropdown Results -->
            <div
              v-if="showCustomerDropdown && filteredCustomers.length > 0"
              class="absolute top-full left-0 right-0 mt-1 bg-white rounded-md border border-gray-300 shadow-lg z-10 max-h-64 overflow-y-auto"
            >
              <div
                v-for="customer in filteredCustomers"
                :key="customer.id"
                @click="selectCustomer(customer.id)"
                class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <p class="font-medium text-gray-900">{{ customer.name }}</p>
                <p class="text-xs text-gray-600">
                  📱 {{ customer.phone }} {{ customer.secondaryPhone ? `• ${customer.secondaryPhone}` : '' }}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  📍 {{ customer.address || '-' }} {{ customer.district ? `• ${customer.district}` : '' }}
                </p>
              </div>
            </div>

            <!-- No results message -->
            <div
              v-else-if="showCustomerDropdown && customerSearchQuery.trim() && filteredCustomers.length === 0"
              class="absolute top-full left-0 right-0 mt-1 bg-white rounded-md border border-gray-300 shadow-lg z-10 p-4 text-center text-sm text-gray-600"
            >
              No customers found. <a href="/customers/new" class="text-blue-600 hover:underline"><b>Create a new one?</b></a>
            </div>
          </div>
        </div>

        <!-- Selected Customer Info -->
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

      <!-- Invoice Items -->
      <div class="rounded-lg border border-gray-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h2>

        <div class="space-y-4">
          <div
            v-for="(item, index) in form.items"
            :key="index"
            class="rounded-lg border border-gray-200 p-4 space-y-4"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-medium text-gray-900">Item {{ index + 1 }}</h3>
              <button
                v-if="form.items.length > 1"
                @click="removeItem(index)"
                type="button"
                class="text-red-600 hover:text-red-700 transition-colors"
              >
                <Icon name="lucide:trash-2" class="h-4 w-4" />
              </button>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Product <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="item.productId"
                  @change="() => {
                    item.variantId = '';
                    validateProductSelection(index);
                    updateUnitPrice(index);
                  }"
                  class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500\"
                >
                  <option value="">-- Select Product --</option>
                  <option v-for="product in products" :key="product.id" :value="product.id" :disabled="isDuplicateProduct(product.id, '', index)">
                    {{ product.name }} ({{ product.sku }}){{ isDuplicateProduct(product.id, '', index) ? ' - Already added' : '' }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Variant (optional)
                </label>
                <select
                  v-model="item.variantId"
                  :disabled="!item.productId"
                  @change="() => {
                    validateProductSelection(index);
                  }"
                  class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                >
                  <option value="">-- No Variant --</option>
                  <option
                    v-for="variant in getProductVariants(item.productId)"
                    :key="variant.id"
                    :value="variant.id"
                    :disabled="isDuplicateProduct(item.productId, variant.id, index)"
                  >
                    {{ variant.name }}{{ isDuplicateProduct(item.productId, variant.id, index) ? ' - Already added' : '' }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span class="text-red-500">*</span>
                  <span v-if="item.productId" class="text-xs font-normal" :class="getAvailableStock(item.productId, item.variantId, index) > 0 ? 'text-green-600' : 'text-red-600'">
                    ({{ getAvailableStock(item.productId, item.variantId, index) }} available)
                  </span>
                </label>
                <input
                  v-model.number="item.quantity"
                  type="number"
                  min="1"
                  :max="getAvailableStock(item.productId, item.variantId, index)"
                  @change="validateStock(index)"
                  @blur="validateStock(index)"
                  class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
                />
                <p v-if="item.productId && getAvailableStock(item.productId, item.variantId, index) === 0" class="mt-1 text-xs text-red-600">
                  ⚠️ Out of stock or already allocated in other items
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="item.unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  v-model.number="item.taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Line Total
                </label>
                <input
                  :value="calculateLineTotal(item)"
                  type="text"
                  disabled
                  class="w-full rounded-md border border-gray-300 px-3 py-2.5 bg-gray-50 text-gray-900 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <!-- Add Item Button -->
          <button
            @click="addItem"
            type="button"
            class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Icon name="lucide:plus" class="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      <!-- Totals and Notes -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Notes -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              v-model="form.notes"
              rows="4"
              placeholder="Add any additional notes to the invoice..."
              class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Summary -->
        <div class="rounded-lg border border-gray-200 bg-white p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Subtotal</span>
              <span class="text-gray-900">{{ formatCurrency(subtotal) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Tax</span>
              <span class="text-gray-900">{{ formatCurrency(totalTax) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Discount</span>
              <input
                v-model.number="form.discountAmount"
                type="number"
                min="0"
                class="w-24 rounded-md border border-gray-300 px-2 py-1 text-right focus:outline-none focus:border-blue-500"
              />
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Delivery Charge</span>
              <input
                v-model.number="form.deliveryCharge"
                type="number"
                min="0"
                class="w-24 rounded-md border border-gray-300 px-2 py-1 text-right focus:outline-none focus:border-blue-500"
              />
            </div>
            <div class="border-t border-gray-200 pt-3 flex justify-between font-semibold">
              <span class="text-gray-900">Total</span>
              <span class="text-gray-900">{{ formatCurrency(totalAmount) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit Section -->
      <div class="flex items-center gap-3 pt-4 border-t border-gray-200">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="form.finalize"
            type="checkbox"
            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-700">Finalize invoice now</span>
        </label>

        <div class="flex-1"></div>

        <NuxtLink
          to="/invoices"
          class="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
        >
          Cancel
        </NuxtLink>
        <button
          type="submit"
          :disabled="saving"
          class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          <Icon name="lucide:save" class="h-4 w-4" />
          {{ form.finalize ? 'Create & Finalize' : 'Create as Draft' }}
        </button>
      </div>
    </form>

    <!-- New Customer Modal -->
    <div v-if="showNewCustomerModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Create New Customer</h2>
          <button
            @click="showNewCustomerModal = false"
            type="button"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon name="lucide:x" class="h-6 w-6" />
          </button>
        </div>

        <form @submit.prevent="handleCreateCustomer" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Customer Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="newCustomerForm.name"
              type="text"
              placeholder="e.g., Ramesh Sharma"
              class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Phone <span class="text-red-500">*</span>
            </label>
            <input
              v-model="newCustomerForm.phone"
              @blur="validatePhone(newCustomerForm.phone)"
              type="tel"
              placeholder="e.g., 9841234567"
              class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
            />
            <p v-if="phoneError" class="mt-1 text-xs text-red-600">{{ phoneError }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Secondary Phone (optional)
            </label>
            <input
              v-model="newCustomerForm.secondaryPhone"
              @blur="validateSecondaryPhone(newCustomerForm.secondaryPhone, newCustomerForm.phone)"
              type="tel"
              placeholder="e.g., 9841234567"
              class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
            />
            <p v-if="secondaryPhoneError" class="mt-1 text-xs text-red-600">{{ secondaryPhoneError }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Street Address (optional)
            </label>
            <input
              v-model="newCustomerForm.street"
              type="text"
              placeholder="e.g., Thamel"
              class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              District
            </label>
            <select
              v-model="newCustomerForm.district"
              class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Select District --</option>
              <option v-for="district in NEPAL_DISTRICTS" :key="district" :value="district">
                {{ district }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Delivery Charge (optional)
            </label>
            <input
              v-model.number="newCustomerForm.deliveryCharge"
              type="number"
              min="0"
              placeholder="e.g., 100"
              class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
            />
            <p class="mt-1 text-xs text-gray-500">Will be used when creating invoices</p>
          </div>

          <!-- Baby Info Section -->
          <div class="border-t border-gray-200 pt-4 mt-4">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">👶 Baby Information (optional)</h3>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Baby Name
              </label>
              <input
                v-model="newCustomerForm.babyName"
                type="text"
                placeholder="e.g., Arun"
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Birthday
                </label>
                <input
                  v-model="newCustomerForm.babyDate"
                  type="date"
                  class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  v-model="newCustomerForm.babyGender"
                  class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Select --</option>
                  <option value="male">👦 Male</option>
                  <option value="female">👧 Female</option>
                  <option value="other">❓ Other</option>
                  <option value="no-idea">🤷 No Idea</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              v-model="newCustomerForm.notes"
              rows="3"
              placeholder="Add any additional notes about the customer..."
              class="w-full rounded-md border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="flex gap-2 justify-end pt-4 border-t border-gray-200">
            <button
              @click="showNewCustomerModal = false"
              type="button"
              class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="creatingCustomer"
              class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              <Icon name="lucide:plus" class="h-4 w-4" />
              {{ creatingCustomer ? 'Creating...' : 'Create Customer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
