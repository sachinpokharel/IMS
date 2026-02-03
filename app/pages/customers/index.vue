<script setup lang="ts">
import type { Customer } from '~/composables/useCustomers';
import { NEPAL_DISTRICTS } from '~~/server/utils/nepal-districts';

const router = useRouter();
const { customers, createCustomer, fetchCustomers } = useCustomers();
const { deleteCustomer } = useCustomers();
const { isAdmin } = useAuth();
const toast = useToast();

const searchQuery = ref('');
const isCreateModalOpen = ref(false);
const isLoading = ref(false);
const deleteConfirm = ref<string | null>(null);
const openMenuId = ref<string | null>(null);
const menuPosition = ref<{ x: number; y: number } | null>(null);

function openActionMenu(customerId: string, event: MouseEvent) {
  if (openMenuId.value === customerId) {
    openMenuId.value = null;
    return;
  }
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  menuPosition.value = {
    x: rect.right,
    y: rect.bottom,
  };
  openMenuId.value = customerId;
}

// Fetch customers on mount
onMounted(async () => {
  try {
    await fetchCustomers();
  } catch (error) {
    console.error('Error fetching customers:', error);
  }
});

const filteredCustomers = computed(() => {
  if (!customers.value) return [];
  if (!searchQuery.value.trim()) return customers.value;

  const query = searchQuery.value.toLowerCase();
  return customers.value.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.district?.toLowerCase().includes(query)
  );
});

const newCustomer = ref<Omit<Customer, 'id'>>({
  name: '',
  phone: '',
  secondaryPhone: '',
  street: '',
  address: '',
  district: '',
});

const phoneError = ref('');
const secondaryPhoneError = ref('');

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

async function handleCreateCustomer() {
  if (!newCustomer.value.name.trim()) {
    toast.error('Validation error', 'Customer name is required');
    return;
  }

  if (!validatePhone(newCustomer.value.phone)) {
    return;
  }

  if (!validateSecondaryPhone(newCustomer.value.secondaryPhone || '', newCustomer.value.phone)) {
    return;
  }

  isLoading.value = true;
  try {
    await createCustomer(newCustomer.value);
    toast.success('Customer created', `${newCustomer.value.name} added successfully`);
    isCreateModalOpen.value = false;
    newCustomer.value = {
      name: '',
      phone: '',
      secondaryPhone: '',
      street: '',
      address: '',
      district: '',
    };
    await fetchCustomers();
  } catch (error: any) {
    console.error('Error creating customer:', error);
    const message = error.data?.statusMessage || 'Failed to create customer';
    toast.error('Error', message);
  } finally {
    isLoading.value = false;
  }
}

async function handleDeleteCustomer(customerId: string, customerName: string) {
  deleteConfirm.value = null;
  try {
    await deleteCustomer(customerId);
    toast.success('Customer deleted', `${customerName} has been removed`);
    await fetchCustomers();
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    const message = error.data?.statusMessage || 'Failed to delete customer';
    toast.error('Error', message);
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
  <div class="space-y-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          Customers
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          Manage your customer information and contact details.
        </p>
      </div>
      <button
        @click="isCreateModalOpen = true"
        class="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 transition-all"
      >
        <Icon name="lucide:plus" class="h-4 w-4" />
        Add Customer
      </button>
    </div>

    <!-- Search Bar -->
    <div class="relative">
      <Icon
        name="lucide:search"
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search by name, phone, or district..."
        class="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
      />
    </div>

    <!-- Customers Table -->
    <div :class="ui.card">
      <div :class="ui.cardHeader">
        <h2 :class="ui.cardTitle">{{ filteredCustomers.length }} Customer(s)</h2>
        <Icon name="lucide:users" class="h-4 w-4 text-gray-400" />
      </div>

      <div v-if="filteredCustomers && filteredCustomers.length > 0" class="overflow-x-auto">
        <table class="w-full">
          <thead class="border-b border-gray-200 bg-gray-50/50">
            <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Cust. ID
                </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Name
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Phone
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Location
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Joined
              </th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="customer in filteredCustomers"
              :key="customer.id"
              class="hover:bg-gray-50/50 transition-colors"
            >
                <td class="px-4 py-3 text-sm text-gray-600">
                  {{ customer.id }}
                </td>
              <td class="px-4 py-3 text-sm font-medium text-gray-900">
                {{ customer.name }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">
                {{ customer.phone }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">
                <span v-if="customer.district" class="text-xs inline-block rounded-full bg-gray-100 px-2 py-1">
                  {{ customer.district }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">
                {{
                  customer.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString('en-NP')
                    : '-'
                }}
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  @click="openActionMenu(customer.id, $event)"
                  class="text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors p-2 rounded"
                  title="Actions"
                >
                  <Icon name="lucide:more-vertical" class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="flex flex-col items-center justify-center py-12 text-gray-400">
        <Icon name="lucide:users" class="h-12 w-12 mb-3 text-gray-300" />
        <p class="text-sm">
          {{ searchQuery ? 'No customers found' : 'No customers yet. Click "Add Customer" to get started.' }}
        </p>
      </div>
    </div>

    <!-- Create Customer Modal -->
    <ClientOnly>
      <Teleport to="body">
      <!-- Action Dropdown Menu -->
      <div
        v-if="openMenuId && menuPosition"
        class="fixed z-40"
        :style="{
          left: (menuPosition.x - 192) + 'px',
          top: menuPosition.y + 'px',
        }"
      >
        <div class="w-48 rounded-md border border-gray-200 bg-white shadow-lg">
          <button
            @click="router.push(`/customers/${openMenuId}`); openMenuId = null"
            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors first:rounded-t-md flex items-center gap-2"
          >
            <Icon name="lucide:eye" class="h-4 w-4" />
            View
          </button>
          <button
            @click="router.push(`/customers/${openMenuId}`); openMenuId = null"
            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Icon name="lucide:edit-2" class="h-4 w-4" />
            Edit
          </button>
          <button
            @click="deleteConfirm = openMenuId; openMenuId = null"
            class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors last:rounded-b-md flex items-center gap-2"
          >
            <Icon name="lucide:trash-2" class="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <!-- Overlay to close menu -->
      <div
        v-if="openMenuId"
        class="fixed inset-0 z-30"
        @click="openMenuId = null"
      />

      <!-- Delete Confirmation Modal -->
      <Transition
        enter-active-class="duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="deleteConfirm"
          class="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40"
          @click.self="deleteConfirm = null"
        >
          <div
            class="relative w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200"
          >
            <div class="flex items-center gap-3 mb-4">
              <Icon name="lucide:alert-circle" class="h-6 w-6 text-red-600" />
              <h3 class="text-lg font-semibold text-gray-900">Delete Customer</h3>
            </div>
            <p class="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this customer? This action cannot be undone.
            </p>
            <div class="flex gap-3">
              <button
                @click="deleteConfirm = null"
                class="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                @click="handleDeleteCustomer(deleteConfirm, '')"
                class="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Create/Add Customer Modal -->
      <Transition
        enter-active-class="duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isCreateModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40"
          @click.self="isCreateModalOpen = false"
        >
          <div
            class="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200"
          >
            <!-- Header -->
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">Add New Customer</h2>
              <button
                @click="isCreateModalOpen = false"
                class="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Icon name="lucide:x" class="h-5 w-5" />
              </button>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleCreateCustomer" class="space-y-4">
              <div>
                <label :class="ui.label">Full Name</label>
                <input
                  v-model="newCustomer.name"
                  type="text"
                  placeholder="Enter customer name"
                  :class="ui.input"
                  required
                />
              </div>

              <div>
                <label :class="ui.label">Phone Number</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600">
                    +977
                  </span>
                  <input
                    v-model="newCustomer.phone"
                    type="text"
                    inputmode="numeric"
                    placeholder="Enter phone number"
                    maxlength="10"
                    @input="newCustomer.phone = newCustomer.phone?.replace(/\D/g, '').slice(0, 10) || ''"
                    :class="[
                      ui.input,
                      'pl-12',
                      phoneError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
                    ]"
                    @blur="validatePhone(newCustomer.phone)"
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
                  v-model="newCustomer.secondaryPhone"
                  type="text"
                  inputmode="numeric"
                  placeholder="Enter secondary phone"
                  maxlength="10"
                  @input="newCustomer.secondaryPhone = newCustomer.secondaryPhone?.replace(/\D/g, '').slice(0, 10) || ''"
                  @blur="validateSecondaryPhone(newCustomer.secondaryPhone || '', newCustomer.phone)"
                  :class="[
                    ui.input,
                    'pl-12',
                    secondaryPhoneError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
                  ]"
                />
                <p v-if="secondaryPhoneError" class="mt-1 text-xs text-red-600">
                  {{ secondaryPhoneError }}
                </p>
              </div>
              </div>

              <div>
                <label :class="ui.label">Street Address</label>
                <input
                  v-model="newCustomer.street"
                  type="text"
                  placeholder="Enter street address"
                  :class="ui.input"
                />
              </div>

              <div>
                <label :class="ui.label">Address/City</label>
                <input
                  v-model="newCustomer.address"
                  type="text"
                  placeholder="Enter city/town"
                  :class="ui.input"
                />
              </div>

              <div>
                <label :class="ui.label">District</label>
                <select
                  v-model="newCustomer.district"
                  :class="ui.input"
                >
                  <option value="">Select a district...</option>
                  <option v-for="district in NEPAL_DISTRICTS" :key="district" :value="district">
                    {{ district }}
                  </option>
                </select>
              </div>

              <!-- Actions -->
              <div class="mt-6 flex gap-3">
                <button
                  type="button"
                  @click="isCreateModalOpen = false"
                  class="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="isLoading"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Icon
                    v-if="isLoading"
                    name="lucide:loader-2"
                    class="h-4 w-4 animate-spin"
                  />
                  <span>{{ isLoading ? 'Creating...' : 'Create Customer' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
      </Teleport>
    </ClientOnly>
  </div>
</template>
