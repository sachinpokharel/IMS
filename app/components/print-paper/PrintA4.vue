

<template>
  <div class="print-a4 bg-white rounded-xl shadow p-10 w-full min-h-[297mm]" style="border:1px solid #e5e7eb;">
    <div class="flex justify-between items-start mb-8">
      <div>
        <div class="font-bold text-lg">{{ invoice.companyName || 'Your Company Inc.' }}</div>
        <div class="text-gray-600 text-sm">{{ invoice.companyAddress || '1234 Company St, Company Town, ST 12345' }}</div>
        <div class="text-gray-600 text-sm">{{ invoice.companyPhone || '' }}</div>
      </div>
      <div class="flex flex-col items-center">
        <img v-if="invoice.companyLogo" :src="invoice.companyLogo" alt="Logo" class="h-24 w-24 object-contain mb-2" />
        <div v-else class="border rounded px-6 py-2 text-gray-500 text-sm">Upload Logo</div>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-8 mb-6">
      <div>
        <div class="font-bold text-green-700 text-xl tracking-widest mb-2">INVOICE</div>
        <div class="mb-1">
          <span class="text-gray-500">Invoice #</span>
          <span class="font-semibold">{{ invoice.invoiceNumber }}</span>
        </div>
        <div class="mb-1">
          <span class="text-gray-500">Invoice date</span>
          <span class="font-semibold">{{ formatDate(invoice.issuedDate) }}</span>
        </div>
        <div>
          <span class="text-gray-500">Due date</span>
          <span class="font-semibold">{{ formatDate(invoice.dueDate) }}</span>
        </div>
      </div>
      <div>
        <div class="font-bold text-green-700 text-sm mb-1">Bill To</div>
        <div class="font-semibold">{{ customer?.name }}</div>
        <div class="text-gray-600 text-sm">{{ customer?.address }}</div>
        <div class="text-gray-600 text-sm">{{ customer?.district }}</div>
      </div>
      <div>
        <div class="font-bold text-green-700 text-sm mb-1">Shipping Address</div>
        <div class="font-semibold">{{ customer?.shippingName || customer?.name }}</div>
        <div class="text-gray-600 text-sm">{{ customer?.shippingAddress || customer?.address }}</div>
        <div class="text-gray-600 text-sm">{{ customer?.shippingDistrict || customer?.district }}</div>
        <div class="text-gray-600 text-sm">{{ customer?.shippingPhone || customer?.phone }}</div>
    
      </div>
    </div>
    <table class="w-full mb-6 border" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#4b807c;color:#fff;">
          <th class="p-2 text-left font-semibold">QTY</th>
          <th class="p-2 text-left font-semibold">Description</th>
          <th class="p-2 text-right font-semibold">Unit Price</th>
          <th class="p-2 text-right font-semibold">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in invoice.items" :key="item.id" style="border-bottom:1px solid #e5e7eb;">
          <td class="p-2 text-left">{{ item.quantity }}</td>
          <td class="p-2 text-left">{{ item.product?.name }}</td>
          <td class="p-2 text-right">{{ formatCurrency(item.unitPrice) }}</td>
          <td class="p-2 text-right">{{ formatCurrency(item.lineTotal || 0) }}</td>
        </tr>
      </tbody>
    </table>
    <div class="flex flex-col items-end mb-6">
      <div class="flex justify-between w-64 mb-1">
        <span class="text-gray-600">Subtotal</span>
        <span>{{ formatCurrency(invoice.subtotal || 0) }}</span>
      </div>
      <div class="flex justify-between w-64 mb-1">
        <span class="text-gray-600">Sales Tax ({{ invoice.taxRate || '0%' }})</span>
        <span>{{ formatCurrency(invoice.taxAmount || 0) }}</span>
      </div>
      <div v-if="invoice.discountAmount && invoice.discountAmount > 0" class="flex justify-between w-64 mb-1">
        <span class="text-gray-600">Discount</span>
        <span>-{{ formatCurrency(invoice.discountAmount) }}</span>
      </div>
      <div v-if="invoice.deliveryCharge && invoice.deliveryCharge > 0" class="flex justify-between w-64 mb-1">
        <span class="text-gray-600">Delivery Charge</span>
        <span>{{ formatCurrency(invoice.deliveryCharge) }}</span>
      </div>
      <div class="flex justify-between w-64 font-bold text-lg border-t pt-2" style="color:#4b807c;">
        <span>Total ({{ invoice.currency || 'NPR' }})</span>
        <span>{{ formatCurrency(invoice.totalAmount || 0) }}</span>
      </div>
    </div>

    <!-- Payment Details Section -->
    <div v-if="invoice.payments && invoice.payments.length > 0" class="mb-6 border-t pt-4">
      <div class="font-bold text-green-700 text-sm mb-3">Payment Details</div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <!-- Completed Payments (excluding COD) -->
          <div v-if="completedPayments.length > 0" class="mb-4">
            <div class="text-xs font-semibold text-gray-700 mb-2">Payments Received</div>
            <table class="w-full text-xs">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th class="p-2 text-left font-semibold text-gray-700">#</th>
                  <th class="p-2 text-left font-semibold text-gray-700">Method</th>
                  <th class="p-2 text-right font-semibold text-gray-700">Amount</th>
                  <th class="p-2 text-left font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(payment, index) in completedPayments" :key="payment.id" style="border-bottom:1px solid #e5e7eb;">
                  <td class="p-2 text-left">{{ index + 1 }}</td>
                  <td class="p-2 text-left">{{ payment.method }}</td>
                  <td class="p-2 text-right font-semibold">{{ formatCurrency(payment.amount) }}</td>
                  <td class="p-2 text-left text-xs text-gray-600">{{ formatDate(payment.paidDate) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- COD Payments (Due on Delivery) -->
          <div v-if="codPayments.length > 0" class="mb-4">
            <div class="text-xs font-semibold text-orange-700 mb-2">Due on Delivery (COD)</div>
            <table class="w-full text-xs">
              <thead>
                <tr style="background:#fff7ed;">
                  <th class="p-2 text-left font-semibold text-orange-700">Payment Method</th>
                  <th class="p-2 text-right font-semibold text-orange-700">Amount Due</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="payment in codPayments" :key="payment.id" style="border-bottom:1px solid #fed7aa;">
                  <td class="p-2 text-left">Cash on Delivery</td>
                  <td class="p-2 text-right font-bold text-orange-700">{{ formatCurrency(payment.amount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="flex flex-col justify-center items-end">
          <div class="w-48 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Total Paid:</span>
              <span class="font-semibold text-green-700">{{ formatCurrency(totalPaid) }}</span>
            </div>
            <div v-if="codPayments.length > 0" class="flex justify-between text-sm">
              <span class="text-orange-600">COD Due:</span>
              <span class="font-semibold text-orange-700">{{ formatCurrency(totalCod) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Remaining:</span>
              <span :class="invoice.totalAmount - totalPaid > 0 ? 'font-semibold text-red-600' : 'font-semibold text-green-700'">
                {{ formatCurrency(Math.max(0, invoice.totalAmount - totalPaid)) }}
              </span>
            </div>
            <div v-if="invoice.totalAmount - totalPaid === 0" class="pt-2 border-t">
              <div class="text-green-700 font-bold text-sm flex items-center gap-1">
                <span>✓</span>
                <span>Fully Paid</span>
              </div>
            </div>
            <div v-else-if="completedPayments.length > 0" class="pt-2 border-t">
              <div class="text-orange-700 font-semibold text-xs">
                Partial Payment Received
              </div>
            </div>
            <div v-else-if="codPayments.length > 0" class="pt-2 border-t">
              <div class="text-orange-700 font-semibold text-xs">
                💰 Payment Due on Delivery
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8">
      <div class="font-bold text-green-700 text-sm mb-1">Terms and Conditions</div>
      <div class="text-gray-600 text-sm">Payment is due in 14 days</div>
      <div class="text-gray-600 text-sm">Please make checks payable to: {{ invoice.companyName || 'Your Company Inc.' }}</div>
    </div>
  </div>
 
</template>

<script setup lang="ts">
import { computed } from 'vue';
interface Payment {
  id: string;
  method: string;
  amount: number;
  paidDate?: string | number | Date;
}

interface Invoice {
  invoiceNumber: string;
  issuedDate: string | number | Date;
  dueDate: string | number | Date;
  subtotal: number;
  taxAmount: number;
  taxRate?: string;
  discountAmount?: number;
  deliveryCharge?: number;
  totalAmount: number;
  items: any[];
  payments?: Payment[];
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyLogo?: string;
  currency?: string;
}

const props = defineProps<{ 
  invoice: Invoice, 
  customer: any, 
  formatCurrency: (val: number) => string, 
  formatDate: (val: any) => string 
}>();

const completedPayments = computed(() => (props.invoice.payments || []).filter(p => p.method !== 'cod'));
const codPayments = computed(() => (props.invoice.payments || []).filter(p => p.method === 'cod'));
const totalPaid = computed(() => completedPayments.value.reduce((sum, p) => sum + p.amount, 0));
const totalCod = computed(() => codPayments.value.reduce((sum, p) => sum + p.amount, 0));
</script>

<style scoped>
.print-a4 {
  width: 210mm;
  min-height: 297mm;
  max-width: 210mm;
  font-size: 16px;
  margin: 0 auto;
  box-sizing: border-box;
}
@media print {
  @page {
    size: A4;
    margin: 0;
  }
  body, html {
    width: 100vw;
    height: 100vh;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }
  .print-a4 {
    width: 210mm !important;
    min-height: 297mm !important;
    max-width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    background: #fff !important;
    page-break-after: avoid;
    page-break-before: avoid;
  }
}
</style>
