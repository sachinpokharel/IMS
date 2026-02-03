<script setup lang="ts">
import type { Invoice } from '~/composables/useInvoices';

const route = useRoute();
const router = useRouter();
const { getInvoice, updateInvoice, recordPayment } = useInvoices();
const toast = useToast();

const invoice = ref<Invoice | null>(null);
const loading = ref(true);
const saving = ref(false);
const deliveryChargeInput = ref(0);
const paymentForm = reactive({
  amount: '',
  method: 'bank',
  reference: '',
  notes: '',
});
const showPaymentForm = ref(false);

onMounted(async () => {
  const id = route.params.id as string;
  try {
    invoice.value = await getInvoice(id);
    if (invoice.value) {
      deliveryChargeInput.value = invoice.value.deliveryCharge || 0;
    }
  } catch (error) {
    toast.error('Failed to load invoice');
    router.back();
  } finally {
    loading.value = false;
  }
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

const totalPaid = computed(() => {
  if (!invoice.value?.payments) return 0;
  return invoice.value.payments.reduce((sum, p) => sum + p.amount, 0);
});

const remainingBalance = computed(() => {
  if (!invoice.value) return 0;
  return Math.max(0, invoice.value.totalAmount - totalPaid.value);
});

async function handleRecordPayment() {
  if (!invoice.value || !paymentForm.amount) return;

  saving.value = true;
  try {
    const amount = parseFloat(paymentForm.amount);
    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (amount > remainingBalance.value) {
      toast.error('Amount exceeds remaining balance');
      return;
    }

    await recordPayment(invoice.value.id, {
      amount,
      method: paymentForm.method,
      reference: paymentForm.reference,
      notes: paymentForm.notes,
    });

    // Reload invoice
    invoice.value = await getInvoice(invoice.value.id);
    
    // Check if invoice is now fully paid and auto-update status
    const newTotalPaid = invoice.value.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const newRemaining = Math.max(0, invoice.value.totalAmount - newTotalPaid);
    
    if (newRemaining === 0 && invoice.value.status !== 'paid') {
      await updateInvoice(invoice.value.id, { status: 'paid' });
      invoice.value = await getInvoice(invoice.value.id);
      toast.success('Payment recorded and invoice marked as paid!');
    } else {
      toast.success('Payment recorded successfully');
    }
    
    // Reset form
    paymentForm.amount = '';
    paymentForm.reference = '';
    paymentForm.notes = '';
    paymentForm.method = 'bank';
    showPaymentForm.value = false;
  } catch (error) {
    toast.error('Failed to record payment');
  } finally {
    saving.value = false;
  }
}

async function updateDeliveryCharge() {
  if (!invoice.value) return;

  saving.value = true;
  try {
    await updateInvoice(invoice.value.id, {
      deliveryCharge: deliveryChargeInput.value,
    });
    // Refresh invoice to get updated totals
    invoice.value = await getInvoice(invoice.value.id);
    deliveryChargeInput.value = invoice.value.deliveryCharge || 0;
    toast.success('Delivery charge updated');
  } catch (error) {
    toast.error('Failed to update delivery charge');
    // Reset to original value
    if (invoice.value) {
      deliveryChargeInput.value = invoice.value.deliveryCharge || 0;
    }
  } finally {
    saving.value = false;
  }
}

async function handleFinalize() {
  if (!invoice.value) return;

  saving.value = true;
  try {
    await updateInvoice(invoice.value.id, {
      status: 'finalized',
    });
    invoice.value = await getInvoice(invoice.value.id);
    toast.success('Invoice finalized');
  } catch (error) {
    toast.error('Failed to finalize invoice');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-if="!loading" class="space-y-6">
    <!-- Header -->
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          Invoice {{ invoice?.invoiceNumber }}
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          Created {{ formatDate(invoice?.issuedDate) }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span
          v-if="invoice"
          :class="[
            'inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold',
            getStatusColor(invoice.status),
          ]"
        >
          {{ invoice.status }}
        </span>
        <NuxtLink
          :to="`/invoices/print/${invoice?.id}`"
          class="inline-flex items-center gap-2 rounded-md bg-gray-100 border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-200 transition-all"
        >
          <Icon name="lucide:printer" class="h-4 w-4" />
          Print
        </NuxtLink>
        <button
          v-if="invoice?.status === 'draft'"
          @click="handleFinalize"
          :disabled="saving"
          class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          <Icon name="lucide:check" class="h-4 w-4" />
          Finalize
        </button>
      </div>
    </div>

    <div v-if="invoice" class="grid gap-6 lg:grid-cols-3">
      <!-- Main Content -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Customer Info -->
        <div class="rounded-lg border border-gray-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
          <div class="space-y-2">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</p>
              <p class="text-gray-900">{{ invoice.customer?.name || '-' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</p>
              <p class="text-gray-900">{{ invoice.customer?.phone || '-' }}</p>
            </div>
            <div class="grid grid-cols-3 gap-4 pt-2">
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</p>
                <p class="text-gray-900 text-sm">{{ invoice.customer?.address || '-' }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">District</p>
                <p class="text-gray-900 text-sm">{{ invoice.customer?.district || '-' }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Charge</p>
                <input
                  v-if="invoice.status === 'draft'"
                  v-model.number="deliveryChargeInput"
                  type="number"
                  min="0"
                  placeholder="0"
                  @blur="updateDeliveryCharge"
                  class="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                />
                <p v-else class="text-gray-900 text-sm">{{ formatCurrency(invoice.deliveryCharge || 0) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Line Items -->
        <div class="rounded-lg border border-gray-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="border-b border-gray-200">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Description
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Qty
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Unit Price
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Tax
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="item in invoice.items" :key="item.id">
                  <td class="px-4 py-3 text-sm text-gray-900">
                    {{ item.product?.name || 'Unknown Product' }}
                    <span v-if="item.variant" class="text-xs text-gray-600">
                      - {{ item.variant.name }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right text-sm text-gray-900">{{ item.quantity }}</td>
                  <td class="px-4 py-3 text-right text-sm text-gray-900">
                    {{ formatCurrency(item.unitPrice) }}
                  </td>
                  <td class="px-4 py-3 text-right text-sm text-gray-900">
                    {{ item.taxRate }}% ({{ formatCurrency(item.taxAmount || 0) }})
                  </td>
                  <td class="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {{ formatCurrency(item.lineTotal || 0) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Payments -->
        <div class="rounded-lg border border-gray-200 bg-white p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Payment Details</h2>
            <button
              v-if="invoice.status !== 'draft' && remainingBalance > 0"
              @click="showPaymentForm = !showPaymentForm"
              class="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-700 transition-all"
            >
              <Icon name="lucide:plus" class="h-4 w-4" />
              Add Payment
            </button>
          </div>

          <!-- Quick Payment Summary Cards -->
          <div class="mb-4 grid grid-cols-3 gap-3">
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Invoice</p>
              <p class="text-lg font-bold text-gray-900">{{ formatCurrency(invoice.totalAmount) }}</p>
            </div>
            <div class="rounded-lg bg-green-50 p-3">
              <p class="text-xs font-semibold text-green-600 uppercase tracking-wide">Paid</p>
              <p class="text-lg font-bold text-green-700">{{ formatCurrency(totalPaid) }}</p>
            </div>
            <div :class="remainingBalance > 0 ? 'bg-red-50' : 'bg-green-50'" class="rounded-lg p-3">
              <p :class="remainingBalance > 0 ? 'text-red-600' : 'text-green-600'" class="text-xs font-semibold uppercase tracking-wide">
                {{ remainingBalance > 0 ? 'Remaining' : 'Completed' }}
              </p>
              <p :class="remainingBalance > 0 ? 'text-red-700' : 'text-green-700'" class="text-lg font-bold">
                {{ formatCurrency(remainingBalance) }}
              </p>
            </div>
          </div>

          <!-- Payment Form -->
          <div v-if="showPaymentForm" class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 class="font-semibold text-gray-900 mb-4">Record Payment</h3>
            <div class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model.number="paymentForm.amount"
                    type="number"
                    placeholder="0.00"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    Max available: {{ formatCurrency(remainingBalance) }}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    v-model="paymentForm.method"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cod">Cash on Delivery</option>
                  </select>
                  <p v-if="paymentForm.method === 'cod' && remainingBalance > 0" class="mt-2 text-xs bg-orange-50 border border-orange-200 rounded p-2 text-orange-800">
                    💰 This payment will be collected on delivery.
                  </p>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Reference (optional)
                </label>
                <input
                  v-model="paymentForm.reference"
                  type="text"
                  placeholder="e.g., Bank ref, Check #, Transaction ID, etc."
                  class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  v-model="paymentForm.notes"
                  rows="2"
                  placeholder="e.g., Pre-payment before delivery, Schedule COD for next week, etc."
                  class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div class="flex gap-2 justify-end">
                <button
                  @click="showPaymentForm = false"
                  class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  @click="handleRecordPayment"
                  :disabled="!paymentForm.amount || saving || paymentForm.amount > remainingBalance"
                  :title="paymentForm.amount > remainingBalance ? 'Amount exceeds remaining balance' : ''"
                  class="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-all"
                >
                  <Icon name="lucide:check" class="h-4 w-4" />
                  Record Payment
                </button>
              </div>
            </div>
          </div>

          <!-- Payments List -->
          <div class="space-y-3">
            <div v-if="invoice.payments && invoice.payments.length > 0">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Payment History</h3>
              <div class="space-y-2">
                <div
                  v-for="(payment, index) in invoice.payments"
                  :key="payment.id"
                  class="flex items-start justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-semibold text-gray-900">
                        Payment {{ index + 1 }}
                      </span>
                      <span class="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-semibold">
                        ✓ Completed
                      </span>
                    </div>
                    <p class="text-sm font-medium text-gray-900 mb-1">
                      {{ formatCurrency(payment.amount) }}
                    </p>
                    <p class="text-xs text-gray-600">
                      <span class="font-semibold">Method:</span> {{ payment.method }} • <span class="font-semibold">Date:</span> {{ formatDate(payment.paidDate) }}
                    </p>
                    <p v-if="payment.reference" class="text-xs text-gray-500 mt-1">
                      <span class="font-semibold">Ref:</span> {{ payment.reference }}
                    </p>
                    <p v-if="payment.notes" class="text-xs text-gray-500 mt-1 italic">
                      "{{ payment.notes }}"
                    </p>
                  </div>
                  <div class="text-right">
                    <Icon name="lucide:check-circle-2" class="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Remaining Payment Due -->
            <div v-if="remainingBalance > 0" class="mt-4 pt-4 border-t border-gray-200">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Outstanding Payment Due</h3>
              <div class="rounded-lg border border-red-200 bg-red-50 p-4">
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <p class="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Amount Due</p>
                    <p class="text-2xl font-bold text-red-700">
                      {{ formatCurrency(remainingBalance) }}
                    </p>
                  </div>
                </div>
                <div class="space-y-2 text-xs text-red-700">
                  <p>
                    <span class="font-semibold">Status:</span> Awaiting payment
                  </p>
                  <p v-if="invoice.payments && invoice.payments.length > 0">
                    <span class="font-semibold">Payment Status:</span> Partial payment received • {{ invoice.payments.length }} payment(s) recorded
                  </p>
                  <p v-else>
                    <span class="font-semibold">Payment Status:</span> No payments yet • Full amount due
                  </p>
                </div>
              </div>
            </div>

            <!-- Fully Paid -->
            <div v-if="remainingBalance === 0 && invoice.payments && invoice.payments.length > 0" class="mt-4 pt-4 border-t border-gray-200">
              <div class="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                <Icon name="lucide:check-circle" class="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p class="text-sm font-semibold text-green-800">
                  ✓ Invoice Fully Paid
                </p>
                <p class="text-xs text-green-700 mt-1">
                  All payments completed • Total: {{ formatCurrency(invoice.totalAmount) }}
                </p>
              </div>
            </div>

            <!-- No Payments Yet -->
            <div v-if="(!invoice.payments || invoice.payments.length === 0) && invoice.status !== 'draft'" class="text-center py-8 text-gray-400">
              <Icon name="lucide:credit-card" class="h-12 w-12 mx-auto mb-2" />
              <p class="text-sm">No payments recorded yet</p>
              <p class="text-xs text-gray-500 mt-1">Total amount due: {{ formatCurrency(invoice.totalAmount) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar: Summary -->
      <div class="space-y-6">
        <!-- Invoice Summary -->
        <div class="rounded-lg border border-gray-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Subtotal</span>
              <span class="text-gray-900">{{ formatCurrency(invoice.subtotal) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Tax</span>
              <span class="text-gray-900">{{ formatCurrency(invoice.taxAmount) }}</span>
            </div>
            <div v-if="invoice.discountAmount" class="flex justify-between text-sm">
              <span class="text-gray-600">Discount</span>
              <span class="text-red-600">-{{ formatCurrency(invoice.discountAmount) }}</span>
            </div>
            <div v-if="invoice.deliveryCharge" class="flex justify-between text-sm">
              <span class="text-gray-600">Delivery Charge</span>
              <span class="text-gray-900">+{{ formatCurrency(invoice.deliveryCharge) }}</span>
            </div>
            <div class="border-t border-gray-200 pt-3 flex justify-between">
              <span class="font-semibold text-gray-900">Total Amount</span>
              <span class="font-semibold text-gray-900">
                {{ formatCurrency(invoice.totalAmount) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Payment Summary -->
        <div class="rounded-lg border border-gray-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Payment Status</h2>
          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Total Paid</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(totalPaid) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Remaining</span>
              <span :class="remainingBalance > 0 ? 'text-red-600' : 'text-green-600'" class="font-medium">
                {{ formatCurrency(remainingBalance) }}
              </span>
            </div>
            <div class="pt-3 border-t border-gray-200">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-gray-600">Payment Progress</span>
                <span class="text-xs font-semibold text-gray-600">
                  {{ Math.round((totalPaid / invoice.totalAmount) * 100) }}%
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-green-600 h-2 rounded-full transition-all"
                  :style="{ width: `${(totalPaid / invoice.totalAmount) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Invoice Details -->
        <div class="rounded-lg border border-gray-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          <div class="space-y-3 text-sm">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Issued</p>
              <p class="text-gray-900">{{ formatDate(invoice.issuedDate) }}</p>
            </div>
            <div v-if="invoice.dueDate">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Due</p>
              <p class="text-gray-900">{{ formatDate(invoice.dueDate) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Method</p>
              <div class="mt-1 flex items-center gap-2">
                <span v-if="invoice.paymentMethod === 'cash_on_delivery'" class="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                  💰 Cash on Delivery
                </span>
                <span v-else-if="invoice.paymentMethod === 'bank'" class="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                  🏦 Bank Transfer
                </span>
                <span v-else-if="invoice.paymentMethod === 'cash'" class="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                  💵 Cash
                </span>
                <span v-else class="text-gray-600">-</span>
              </div>
            </div>
            <div v-if="invoice.notes">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</p>
              <p class="text-gray-900 whitespace-pre-wrap">{{ invoice.notes }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
