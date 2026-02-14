<template>
  <div class="print-80mm">
    <!-- 80mm Thermal Printer Layout -->
    <h1 class="text-center text-lg font-bold mb-2">Invoice</h1>
    <div class="text-xs mb-1">{{ invoice.invoiceNumber }}</div>
    <div class="text-xs mb-1">Date: {{ formatDate(invoice.issuedDate) }}</div>
    <div class="text-xs mb-1">Customer: {{ customer?.name }}</div>
    <table class="w-full text-xs mb-2">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in invoice.items" :key="item.id">
          <td>{{ item.product?.name }}</td>
          <td>{{ item.quantity }}</td>
          <td>{{ formatCurrency(item.unitPrice) }}</td>
          <td>{{ formatCurrency(item.lineTotal || 0) }}</td>
        </tr>
      </tbody>
    </table>
    <div class="flex justify-between text-xs">
      <span>Subtotal:</span>
      <span>{{ formatCurrency(invoice.subtotal || 0) }}</span>
    </div>
    <div class="flex justify-between text-xs">
      <span>Tax:</span>
      <span>{{ formatCurrency(invoice.taxAmount || 0) }}</span>
    </div>
    <div v-if="invoice.discountAmount && invoice.discountAmount > 0" class="flex justify-between text-xs">
      <span>Discount:</span>
      <span>-{{ formatCurrency(invoice.discountAmount) }}</span>
    </div>
    <div v-if="invoice.deliveryCharge && invoice.deliveryCharge > 0" class="flex justify-between text-xs">
      <span>Delivery:</span>
      <span>{{ formatCurrency(invoice.deliveryCharge) }}</span>
    </div>
    <div class="flex justify-between text-xs font-bold border-t pt-1 mt-1">
      <span>Total:</span>
      <span>{{ formatCurrency(invoice.totalAmount || 0) }}</span>
    </div>

    <div v-if="invoice.payments && invoice.payments.length > 0" class="mt-2 pt-2 border-t">
      <!-- Completed Payments (excluding COD) -->
      <div v-if="completedPayments.length > 0" class="mb-2">
        <div class="text-xs font-bold mb-1">Payments Received:</div>
        <div v-for="(payment, index) in completedPayments" :key="payment.id" class="flex justify-between text-xs mb-1">
          <span>{{ index + 1 }}. {{ payment.method }}</span>
          <span>{{ formatCurrency(payment.amount) }}</span>
        </div>
      </div>

      <!-- COD Payments (Due) -->
      <div v-if="codPayments.length > 0" class="mb-2 pt-1 border-t">
        <div class="text-xs font-bold mb-1">Due on Delivery:</div>
        <div v-for="payment in codPayments" :key="payment.id" class="flex justify-between text-xs mb-1">
          <span>💰 Cash on Delivery</span>
          <span class="font-bold">{{ formatCurrency(payment.amount) }}</span>
        </div>
      </div>

      <div class="border-t pt-1 mt-1">
        <div class="flex justify-between text-xs font-bold">
          <span>Paid:</span>
          <span>{{ formatCurrency(totalPaid) }}</span>
        </div>
        <div v-if="codPayments.length > 0" class="flex justify-between text-xs">
          <span>COD Due:</span>
          <span class="font-bold">{{ formatCurrency(totalCod) }}</span>
        </div>
        <div class="flex justify-between text-xs">
          <span>Remaining:</span>
          <span :class="invoice.totalAmount - totalPaid > 0 ? 'font-bold' : ''">
            {{ formatCurrency(Math.max(0, invoice.totalAmount - totalPaid)) }}
          </span>
        </div>
      </div>

      <div v-if="invoice.totalAmount - totalPaid === 0" class="text-center text-xs font-bold mt-1">
        ✓ FULLY PAID
      </div>
      <div v-else-if="codPayments.length > 0" class="text-center text-xs font-bold mt-1">
        💰 PAY ON DELIVERY
      </div>
    </div>

    <div class="text-center text-xs mt-2">Thank you!</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
interface Payment {
  id: string;
  method: string;
  amount: number;
}

interface Invoice {
  invoiceNumber: string;
  issuedDate: string | number | Date;
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  deliveryCharge?: number;
  totalAmount: number;
  items: any[];
  payments?: Payment[];
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
.print-80mm {
  width: 72mm;
  font-size: 12px;
  line-height: 1.2;
  padding: 0;
  margin: 0 auto;
}
@media print {
  .print-80mm {
    width: 72mm !important;
    max-width: 72mm !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 12px !important;
  }
}
</style>
