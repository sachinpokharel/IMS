<template>
  <div class="print-a4 bg-white rounded-xl shadow p-10 w-full min-h-[297mm]" style="border:1px solid #e5e7eb;">
    <div class="flex justify-between items-start mb-8">
      <div>
        <div class="font-bold text-lg">{{ order.companyName || 'Your Company Inc.' }}</div>
        <div class="text-gray-600 text-sm">{{ order.companyAddress || '1234 Company St, Company Town, ST 12345' }}</div>
        <div class="text-gray-600 text-sm">{{ order.companyPhone || '' }}</div>
      </div>
      <div class="flex flex-col items-center">
        <img v-if="order.companyLogo" :src="order.companyLogo" alt="Logo" class="h-24 w-24 object-contain mb-2" />
        <div v-else class="border rounded px-6 py-2 text-gray-500 text-sm">Upload Logo</div>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-8 mb-6">
      <div>
        <div class="font-bold text-blue-700 text-xl tracking-widest mb-2">ORDER RECEIPT</div>
        <div class="mb-1">
          <span class="text-gray-500">Order #</span>
          <span class="font-semibold">{{ order.orderNumber }}</span>
        </div>
        <div class="mb-1">
          <span class="text-gray-500">Order date</span>
          <span class="font-semibold">{{ formatDate(order.orderDate) }}</span>
        </div>
        <div v-if="order.expectedDeliveryDate">
          <span class="text-gray-500">Expected delivery</span>
          <span class="font-semibold">{{ formatDate(order.expectedDeliveryDate) }}</span>
        </div>
        <div class="mt-2">
          <span
            :class="[
              'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
              order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
              order.status === 'processing' ? 'bg-purple-100 text-purple-800' :
              order.status === 'completed' ? 'bg-green-100 text-green-800' :
              'bg-yellow-100 text-yellow-800'
            ]"
          >
            {{ order.status?.toUpperCase() }}
          </span>
        </div>
      </div>
      <div>
        <div class="font-bold text-blue-700 text-sm mb-1">Customer</div>
        <div class="font-semibold">{{ customer?.name }}</div>
        <div class="text-gray-600 text-sm">{{ customer?.phone }}</div>
        <div class="text-gray-600 text-sm">{{ customer?.address }}</div>
        <div class="text-gray-600 text-sm">{{ customer?.district }}</div>
      </div>
      <div>
        <div class="font-bold text-blue-700 text-sm mb-1">Delivery Address</div>
        <div class="font-semibold">{{ customer?.shippingName || customer?.name }}</div>
        <div class="text-gray-600 text-sm">{{ customer?.shippingAddress || customer?.address }}</div>
        <div class="text-gray-600 text-sm">{{ customer?.shippingDistrict || customer?.district }}</div>
        <div class="text-gray-600 text-sm">{{ customer?.shippingPhone || customer?.phone }}</div>
      </div>
    </div>
    <table class="w-full mb-6 border" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#3b82f6;color:#fff;">
          <th class="p-2 text-left font-semibold">QTY</th>
          <th class="p-2 text-left font-semibold">Description</th>
          <th class="p-2 text-right font-semibold">Unit Price</th>
          <th class="p-2 text-right font-semibold">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in order.items" :key="item.id" style="border-bottom:1px solid #e5e7eb;">
          <td class="p-2 text-left">{{ item.quantity }}</td>
          <td class="p-2 text-left">
            {{ item.product?.name }}
            <span v-if="item.variant" class="text-gray-500 text-sm">({{ item.variant.name }})</span>
          </td>
          <td class="p-2 text-right">{{ formatCurrency(item.unitPrice) }}</td>
          <td class="p-2 text-right">{{ formatCurrency(item.lineTotal || 0) }}</td>
        </tr>
      </tbody>
    </table>
    <div class="flex flex-col items-end mb-6">
      <div class="flex justify-between w-64 mb-1">
        <span class="text-gray-600">Subtotal</span>
        <span>{{ formatCurrency(order.subtotal || 0) }}</span>
      </div>
      <div class="flex justify-between w-64 mb-1">
        <span class="text-gray-600">Tax</span>
        <span>{{ formatCurrency(order.taxAmount || 0) }}</span>
      </div>
      <div v-if="order.discountAmount && order.discountAmount > 0" class="flex justify-between w-64 mb-1">
        <span class="text-gray-600">Discount</span>
        <span>-{{ formatCurrency(order.discountAmount) }}</span>
      </div>
      <div v-if="order.deliveryCharge && order.deliveryCharge > 0" class="flex justify-between w-64 mb-1">
        <span class="text-gray-600">Delivery Charge</span>
        <span>{{ formatCurrency(order.deliveryCharge) }}</span>
      </div>
      <div class="flex justify-between w-64 font-bold text-lg border-t pt-2" style="color:#3b82f6;">
        <span>Total (NPR)</span>
        <span>{{ formatCurrency(order.totalAmount || 0) }}</span>
      </div>
    </div>

    <!-- Payment Status Section -->
    <div class="mb-6 border-t pt-4">
      <div class="font-bold text-blue-700 text-sm mb-3">Payment Information</div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-sm mb-2">
            <span class="text-gray-600">Payment Status:</span>
            <span
              :class="[
                'ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                order.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              ]"
            >
              {{ order.paymentStatus?.toUpperCase() }}
            </span>
          </div>
          <div v-if="order.paymentMethod" class="text-sm">
            <span class="text-gray-600">Payment Method:</span>
            <span class="ml-2 font-semibold">{{ order.paymentMethod.replace('_', ' ').toUpperCase() }}</span>
          </div>
        </div>
        <div class="flex flex-col justify-center items-end">
          <div v-if="order.paymentStatus === 'unpaid'" class="text-orange-600 font-semibold text-sm">
            💰 Payment Due: {{ formatCurrency(order.totalAmount) }}
          </div>
          <div v-else-if="order.paymentStatus === 'paid'" class="text-green-700 font-bold text-sm flex items-center gap-1">
            <span>✓</span>
            <span>Fully Paid</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="order.notes" class="mb-6 border-t pt-4">
      <div class="font-bold text-blue-700 text-sm mb-1">Notes</div>
      <div class="text-gray-600 text-sm">{{ order.notes }}</div>
    </div>

    <div class="mt-8">
      <div class="font-bold text-blue-700 text-sm mb-1">Terms and Conditions</div>
      <div class="text-gray-600 text-sm">This order is confirmed and will be processed for delivery.</div>
      <div class="text-gray-600 text-sm">Please contact us for any inquiries: {{ order.companyPhone || 'N/A' }}</div>
    </div>

    <div class="mt-8 pt-4 border-t text-center">
      <div class="text-gray-500 text-sm">Thank you for your order!</div>
      <div class="text-gray-400 text-xs mt-1">{{ order.companyName || 'Your Company Inc.' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ order: any, customer: any, formatCurrency: Function, formatDate: Function }>();
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
    margin: 0 !important;
    padding: 0 !important;
  }
  .print-a4 {
    border: none !important;
    box-shadow: none !important;
    margin: 0 !important;
  }
}
</style>
