<script setup lang="ts">
import type { Customer } from '~/composables/useCustomers';
import type { Invoice, InvoiceItem } from '~/composables/useInvoices';
import { NEPAL_DISTRICTS } from '~~/server/utils/nepal-districts';

const route = useRoute();
const router = useRouter();
const { getCustomer, updateCustomer, deleteCustomer } = useCustomers();
const { getInvoice } = useInvoices();
const toast = useToast();

const customerId = route.params.id as string;
const customer = ref<Customer | null>(null);
const purchaseHistory = ref<Array<InvoiceItem & { invoiceDate?: number; invoiceNumber?: string }>>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const isEditing = ref(false);
const phoneError = ref('');
const secondaryPhoneError = ref('');

// Remove country code from phone numbers
function stripCountryCode(phone: string): string {
  if (!phone) return '';
  // Remove +977 or leading 0
  return phone.replace(/^\+977|^0/, '').slice(-10);
}

onMounted(async () => {
  isLoading.value = true;
  try {
    customer.value = await getCustomer(customerId);
    // Strip country code from phone numbers for editing
    if (customer.value) {
      customer.value.phone = stripCountryCode(customer.value.phone);
      if (customer.value.secondaryPhone) {
        customer.value.secondaryPhone = stripCountryCode(customer.value.secondaryPhone);
      }
    }
    
    // Fetch customer's invoices and extract purchased products
    try {
      const response = await $fetch<Invoice[]>('/api/invoices', {
        query: { customerId: customerId }
      });
      
      const allItems: Array<InvoiceItem & { invoiceDate?: number; invoiceNumber?: string }> = [];
      response.forEach(invoice => {
        if (invoice.items) {
          invoice.items.forEach(item => {
            allItems.push({
              ...item,
              invoiceDate: invoice.issuedDate,
              invoiceNumber: invoice.invoiceNumber
            });
          });
        }
      });
      purchaseHistory.value = allItems;
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    }
  } catch (error) {
    console.error('Error fetching customer:', error);
    toast.error('Error', 'Failed to load customer');
    await router.push('/customers');
  } finally {
    isLoading.value = false;
  }
});

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

  secondaryPhoneError.value = '';
  return true;
}

async function handleSave() {
  if (!customer.value) return;

  if (!customer.value.name.trim()) {
    toast.error('Validation error', 'Customer name is required');
    return;
  }

  if (!validatePhone(customer.value.phone)) {
    return;
  }

  if (!validateSecondaryPhone(customer.value.secondaryPhone || '', customer.value.phone)) {
    return;
  }

  isSaving.value = true;
  try {
    await updateCustomer(customerId, customer.value);
    toast.success('Customer updated', 'Changes saved successfully');
  } catch (error: any) {
    console.error('Error updating customer:', error);
    const message = error.data?.statusMessage || 'Failed to update customer';
    toast.error('Error', message);
  } finally {
    isSaving.value = false;
  }
}

async function handleDelete() {
  if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
    return;
  }

  isDeleting.value = true;
  try {
    await deleteCustomer(customerId);
    toast.success('Customer deleted', 'Customer has been removed');
    await router.push('/customers');
  } catch (error) {
    console.error('Error deleting customer:', error);
    toast.error('Error', 'Failed to delete customer');
  } finally {
    isDeleting.value = false;
  }
}

const ui = {
  card: 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden',
  cardHeader:
    'px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between',
  cardTitle: 'text-xs font-bold text-gray-700 uppercase tracking-wider',
  label:
    'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5',
  input:
    'block w-full rounded-md border border-gray-300 px-3 py-2.5 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm placeholder:text-gray-400 transition-shadow',
};
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 pb-4">
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/customers"
          class="flex items-center justify-center w-10 h-10 rounded-full border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
        >
          <Icon name="lucide:arrow-left" class="h-5 w-5" />
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
            {{ isLoading ? 'Loading...' : customer?.name || 'Customer' }}
          </h1>
          <p class="mt-1 text-sm text-gray-500">
            Customer ID: {{ customerId }}
          </p>
        </div>
        
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="isEditing = true"
          class="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black transition-all"
        >
          <Icon name="lucide:edit-2" class="h-4 w-4" />
          Edit Customer
        </button>
        <button
          @click="handleDelete"
          :disabled="isDeleting || isLoading"
          class="inline-flex items-center gap-2 rounded-md bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Icon
            :name="isDeleting ? 'lucide:loader-2' : 'lucide:trash-2'"
            :class="isDeleting ? 'animate-spin' : ''"
            class="h-4 w-4"
          />
          {{ isDeleting ? 'Deleting...' : 'Delete' }}
        </button>
      </div>
    </div>


    <!-- Customer Details Form -->
    <div v-if="customer && !isLoading" :class="ui.card">
      <div :class="ui.cardHeader">
        <h2 :class="ui.cardTitle">Customer Information</h2>
        <Icon name="lucide:user" class="h-4 w-4 text-gray-400" />
      </div>

      <!-- View Mode -->
      <div v-if="!isEditing" class="p-5">
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Primary Phone</p>
            <p class="mt-2 text-sm font-medium text-gray-900">+977{{ customer.phone }}</p>
          </div>

          <div v-if="customer.secondaryPhone">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Secondary Phone</p>
            <p class="mt-2 text-sm font-medium text-gray-900">+977{{ customer.secondaryPhone }}</p>
          </div>

          <div v-if="customer.district">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">District</p>
            <p class="mt-2 text-sm font-medium text-gray-900">{{ customer.district }}</p>
          </div>

          <div v-if="customer.address">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">City/Town</p>
            <p class="mt-2 text-sm font-medium text-gray-900">{{ customer.address }}</p>
          </div>

          <div v-if="customer.street">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Street</p>
            <p class="mt-2 text-sm font-medium text-gray-900">{{ customer.street }}</p>
          </div>

          <div v-if="customer.deliveryCharge">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Charge</p>
            <p class="mt-2 text-sm font-medium text-gray-900">NPR {{ customer.deliveryCharge?.toLocaleString('en-NP') }}</p>
          </div>

          <div v-if="customer.createdAt">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined Date</p>
            <p class="mt-2 text-sm font-medium text-gray-900">
              {{ new Date(customer.createdAt).toLocaleDateString('en-NP') }}
            </p>
          </div>
        </div>

        <!-- Baby Information -->
        <div v-if="customer.babyName || customer.babyDate || customer.babyGender" class="mt-6 pt-6 border-t border-gray-200">
          <h3 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">👶 Baby Information</h3>
          <div class="grid gap-5 sm:grid-cols-2">
            <div v-if="customer.babyName">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Baby Name</p>
              <p class="mt-2 text-sm font-medium text-gray-900">{{ customer.babyName }}</p>
            </div>
            <div v-if="customer.babyDate">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</p>
              <p class="mt-2 text-sm font-medium text-gray-900">{{ new Date(customer.babyDate).toLocaleDateString('en-NP') }}</p>
            </div>
            <div v-if="customer.babyGender">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</p>
              <p class="mt-2 text-sm font-medium text-gray-900">
                <span v-if="customer.babyGender === 'male'">👦 Male</span>
                <span v-else-if="customer.babyGender === 'female'">👧 Female</span>
                <span v-else-if="customer.babyGender === 'other'">❓ Other</span>
                <span v-else-if="customer.babyGender === 'no-idea'">🤷 No Idea</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Email and Notes -->
        <div v-if="customer.email || customer.notes" class="mt-6 pt-6 border-t border-gray-200">
          <div class="grid gap-5 sm:grid-cols-2">
            <div v-if="customer.email">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
              <p class="mt-2 text-sm text-gray-900">{{ customer.email }}</p>
            </div>
            <div v-if="customer.notes">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</p>
              <p class="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{{ customer.notes }}</p>
            </div>
          </div>
        </div>

        
      </div>

      <!-- Edit Mode -->
      <form v-else @submit.prevent="handleSave" class="p-5">
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label :class="ui.label">Full Name</label>
            <input
              v-model="customer.name"
              type="text"
              placeholder="Enter customer name"
              :class="ui.input"
              required
            />
          </div>

          <div v-if="customer.createdAt">
            <label :class="ui.label">Joined Date</label>
            <input
              :value="new Date(customer.createdAt).toLocaleDateString('en-NP')"
              type="text"
              disabled
              class="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label :class="ui.label">Phone Number</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600">
                +977
              </span>
              <input
                v-model="customer.phone"
                type="text"
                inputmode="numeric"
                placeholder="10 digit number"
                maxlength="10"
                @input="customer.phone = customer.phone?.replace(/\D/g, '').slice(0, 10) || ''"
                :class="[
                  ui.input,
                  'pl-12',
                  phoneError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
                ]"
                @blur="validatePhone(customer.phone)"
                required
              />
            </div>
            <p v-if="phoneError" class="mt-1 text-xs text-red-600">
              {{ phoneError }}
            </p>
          </div>

          <div>
            <label :class="ui.label">Secondary Phone (Optional)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600">
                +977
              </span>
              <input
                v-model="customer.secondaryPhone"
                type="text"
                inputmode="numeric"
                placeholder="10 digit number"
                maxlength="10"
                @input="customer.secondaryPhone = customer.secondaryPhone?.replace(/\D/g, '').slice(0, 10) || ''"
                @blur="validateSecondaryPhone(customer.secondaryPhone || '', customer.phone)"
                :class="[
                  ui.input,
                  'pl-12',
                  secondaryPhoneError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
                ]"
              />
            </div>
            <p v-if="secondaryPhoneError" class="mt-1 text-xs text-red-600">
              {{ secondaryPhoneError }}
            </p>
          </div>

          <div>
            <label :class="ui.label">Street Address</label>
            <input
              v-model="customer.street"
              type="text"
              placeholder="Enter street"
              :class="ui.input"
            />
          </div>

          <div>
            <label :class="ui.label">City/Town</label>
            <input
              v-model="customer.address"
              type="text"
              placeholder="Enter city/town"
              :class="ui.input"
            />
          </div>

          <div>
            <label :class="ui.label">Delivery Charge (Optional)</label>
            <input
              v-model.number="customer.deliveryCharge"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              :class="ui.input"
            />
          </div>

          <div>
            <label :class="ui.label">District</label>
            <select
              v-model="customer.district"
              :class="ui.input"
            >
              <option value="">Select a district...</option>
              <option v-for="district in NEPAL_DISTRICTS" :key="district" :value="district">
                {{ district }}
              </option>
            </select>
          </div>

          <!-- Baby Information Section -->
          <div class="sm:col-span-2 mt-6 pt-6 border-t border-gray-200">
            <h3 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">👶 Baby Information (Optional)</h3>
            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label :class="ui.label">Baby Name</label>
                <input
                  v-model="customer.babyName"
                  type="text"
                  placeholder="Enter baby name"
                  :class="ui.input"
                />
              </div>

              <div>
                <label :class="ui.label">Date of Birth</label>
                <input
                  v-model="customer.babyDate"
                  type="date"
                  :class="ui.input"
                />
              </div>

              <div>
                <label :class="ui.label">Gender</label>
                <select
                  v-model="customer.babyGender"
                  :class="ui.input"
                >
                  <option value="">Select gender...</option>
                  <option value="male">👦 Male</option>
                  <option value="female">👧 Female</option>
                  <option value="other">❓ Other</option>
                  <option value="no-idea">🤷 No Idea</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Email and Notes Section -->
          <div>
            <label :class="ui.label">Email (Optional)</label>
            <input
              v-model="customer.email"
              type="email"
              placeholder="Enter email address"
              :class="ui.input"
            />
          </div>

          <div>
            <label :class="ui.label">Notes (Optional)</label>
            <textarea
              v-model="customer.notes"
              placeholder="Add any additional information"
              rows="3"
              :class="[ui.input, 'resize-none']"
            />
          </div>
        </div>

        <div class="flex gap-3 pt-6 border-t border-gray-200 mt-6">
          <button
            type="button"
            @click="isEditing = false"
            class="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSaving"
            class="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Icon
              v-if="isSaving"
              name="lucide:loader-2"
              class="h-4 w-4 animate-spin"
            />
            <span>{{ isSaving ? 'Saving...' : 'Save Changes' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Purchase History -->
    <Suspense>
      <template #default>
        <div v-if="customer && !isLoading" :class="ui.card">
          <div :class="ui.cardHeader">
            <h2 :class="ui.cardTitle">Purchase History</h2>
            <Icon name="lucide:shopping-bag" class="h-4 w-4 text-gray-400" />
          </div>

          <div v-if="purchaseHistory.length > 0" class="overflow-x-auto">
            <table class="w-full">
              <thead class="border-b border-gray-200 bg-gray-50/50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                    Invoice
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                    Product
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                    Quantity
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                    Unit Price
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                    Total
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="item in purchaseHistory"
                  :key="`${item.invoiceNumber}-${item.id}`"
                  class="hover:bg-gray-50/50 transition-colors"
                >
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    <NuxtLink
                      :to="`/invoices/${item.invoiceId}`"
                      class="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {{ item.invoiceNumber }}
                    </NuxtLink>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-900">
                    {{ item.product?.name || 'N/A' }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600 text-right">
                    {{ item.quantity }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600 text-right">
                    NPR {{ item.unitPrice?.toLocaleString('en-NP') || '0' }}
                  </td>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    NPR {{ ((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString('en-NP') }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    {{ item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString('en-NP') : '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-12 text-gray-400">
            <Icon name="lucide:shopping-bag" class="h-12 w-12 mb-3 text-gray-300" />
            <p class="text-sm">No purchase by user</p>
          </div>
        </div>
      </template>
      <template #fallback>
        <div :class="ui.card">
          <div :class="ui.cardHeader">
            <h2 :class="ui.cardTitle">Purchase History</h2>
            <Icon name="lucide:shopping-bag" class="h-4 w-4 text-gray-400" />
          </div>
          <div class="flex flex-col items-center justify-center py-12 text-gray-400">
            <Icon name="lucide:loader-2" class="h-12 w-12 mb-3 animate-spin text-gray-400" />
            <p class="text-sm">Loading purchase history...</p>
          </div>
        </div>
      </template>
    </Suspense>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="flex flex-col items-center justify-center py-12 text-gray-400"
    >
      <Icon name="lucide:loader-2" class="h-8 w-8 mb-3 animate-spin" />
      <p class="text-sm">Loading customer details...</p>
    </div>
  </div>
</template>
