
<script setup lang="ts">
import type {
  Product,
  ProductVariant,
} from '~~/server/database/schema';

const toast = useToast();

const isLoading = ref(true);
const lowStockItems = ref<any[]>([]);
const searchQuery = ref('');
const filterType = ref('all'); // all, low, out

const ui = {
  card: 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden',
  cardHeader: 'px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between',
  cardTitle: 'text-xs font-bold text-gray-700 uppercase tracking-wider',
};

onMounted(async () => {
  await fetchLowStockItems();
});

async function fetchLowStockItems() {
  isLoading.value = true;
  try {
    const { data: products } = await useFetch<(Product & { variants?: ProductVariant[] })[]>('/api/products');
    const items: any[] = [];

    if (!products.value || products.value.length === 0) {
      lowStockItems.value = [];
      isLoading.value = false;
      return;
    }

    // Check products
    for (const product of products.value) {
      // Check main product stock
      if (product.stockQuantity === 0) {
        items.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          type: 'product',
          stockQuantity: product.stockQuantity,
          stockMin: product.stockMin,
          stockMax: product.stockMax,
          costPrice: product.costPrice,
          status: 'out',
        });
      } else if (product.stockQuantity && product.stockMin && product.stockQuantity <= product.stockMin) {
        items.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          type: 'product',
          stockQuantity: product.stockQuantity,
          stockMin: product.stockMin,
          stockMax: product.stockMax,
          costPrice: product.costPrice,
          status: 'low',
        });
      }

      // Check variants
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          if (variant.stockQuantity === 0) {
            items.push({
              id: variant.id,
              name: `${product.name} - ${variant.name}`,
              sku: variant.sku,
              type: 'variant',
              productId: product.id,
              variantId: variant.id,
              stockQuantity: variant.stockQuantity,
              stockMin: variant.stockMin,
              stockMax: variant.stockMax,
              costPrice: variant.costPrice,
              price: variant.price,
              status: 'out',
            });
          } else if (variant.stockQuantity && variant.stockQuantity <= (variant.stockMin || 0)) {
            items.push({
              id: variant.id,
              name: `${product.name} - ${variant.name}`,
              sku: variant.sku,
              type: 'variant',
              productId: product.id,
              variantId: variant.id,
              stockQuantity: variant.stockQuantity,
              stockMin: variant.stockMin,
              stockMax: variant.stockMax,
              costPrice: variant.costPrice,
              price: variant.price,
              status: 'low',
            });
          }
        }
      }
    }

    lowStockItems.value = items.sort((a, b) => a.stockQuantity - b.stockQuantity);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    toast.error('Error', 'Failed to load low stock items');
    lowStockItems.value = [];
  } finally {
    isLoading.value = false;
  }
}

const filteredItems = computed(() => {
  let items = lowStockItems.value;

  // Filter by type
  if (filterType.value !== 'all') {
    items = items.filter(item => item.status === filterType.value);
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.sku?.toLowerCase().includes(query)
    );
  }

  return items;
});

const outOfStockCount = computed(() => lowStockItems.value.filter(i => i.status === 'out').length);
const lowStockCount = computed(() => lowStockItems.value.filter(i => i.status === 'low').length);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="border-b border-gray-200 pb-4">
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
        Low Stock & Out of Stock
      </h1>
      <p class="mt-1 text-sm text-gray-500">
        Products and variants that need attention
      </p>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="p-5 rounded-lg border border-red-200 bg-red-50">
        <div class="flex justify-between items-start">
          <p class="text-xs font-bold uppercase tracking-wide text-red-700">
            Out of Stock
          </p>
          <Icon name="lucide:alert-circle" class="h-5 w-5 text-red-600" />
        </div>
        <p class="mt-3 text-2xl font-bold text-red-900">{{ outOfStockCount }}</p>
      </div>

      <div class="p-5 rounded-lg border border-amber-200 bg-amber-50">
        <div class="flex justify-between items-start">
          <p class="text-xs font-bold uppercase tracking-wide text-amber-700">
            Low Stock
          </p>
          <Icon name="lucide:alert-triangle" class="h-5 w-5 text-amber-600" />
        </div>
        <p class="mt-3 text-2xl font-bold text-amber-900">{{ lowStockCount }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div class="relative flex-1">
        <Icon name="lucide:search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by product name or SKU..."
          class="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div class="flex gap-2">
        <button
          @click="filterType = 'all'"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            filterType === 'all'
              ? 'bg-gray-900 text-white'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          ]"
        >
          All
        </button>
        <button
          @click="filterType = 'low'"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            filterType === 'low'
              ? 'bg-amber-600 text-white'
              : 'border border-amber-300 text-amber-700 hover:bg-amber-50'
          ]"
        >
          Low Stock
        </button>
        <button
          @click="filterType = 'out'"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            filterType === 'out'
              ? 'bg-red-600 text-white'
              : 'border border-red-300 text-red-700 hover:bg-red-50'
          ]"
        >
          Out of Stock
        </button>
      </div>
    </div>

    <!-- Items Table -->
    <div v-if="!isLoading" :class="ui.card">
      <div :class="ui.cardHeader">
        <h2 :class="ui.cardTitle">{{ filteredItems.length }} Item(s)</h2>
        <Icon name="lucide:package-alert" class="h-4 w-4 text-gray-400" />
      </div>

      <div v-if="filteredItems.length > 0" class="overflow-x-auto">
        <table class="w-full">
          <thead class="border-b border-gray-200 bg-gray-50/50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product Name</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">SKU</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">Stock</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">Min</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">Max</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="item in filteredItems"
              :key="item.id"
              class="hover:bg-gray-50/50 transition-colors"
            >
              <td class="px-4 py-3 text-sm font-medium text-gray-900">
                {{ item.name }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">
                <span v-if="item.type === 'product'" class="text-xs inline-block rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-700">
                  Product
                </span>
                <span v-else class="text-xs inline-block rounded-full bg-purple-100 px-2 py-1 font-medium text-purple-700">
                  Variant
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600 font-mono">{{ item.sku || '-' }}</td>
              <td class="px-4 py-3 text-center">
                <span
                  v-if="item.status === 'out'"
                  class="text-xs inline-block rounded-full bg-red-100 px-2 py-1 font-medium text-red-700"
                >
                  Out of Stock
                </span>
                <span
                  v-else
                  class="text-xs inline-block rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700"
                >
                  Low Stock
                </span>
              </td>
              <td class="px-4 py-3 text-sm font-semibold text-right" :class="item.stockQuantity === 0 ? 'text-red-600' : 'text-amber-600'">
                {{ item.stockQuantity }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-600 text-right">{{ item.stockMin ?? '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600 text-right">{{ item.stockMax ?? '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600 text-right">
                <NuxtLink
                  :to="`/products/${item.productId || item.id}`"
                  class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors font-medium"
                >
                  <Icon name="lucide:eye" class="h-4 w-4" />
                  View
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="flex flex-col items-center justify-center py-12 text-gray-400">
        <Icon name="lucide:package-check" class="h-12 w-12 mb-3 text-gray-300" />
        <p class="text-sm">No low stock items found</p>
        <p class="text-xs text-gray-400 mt-1">All products are well stocked!</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="flex flex-col items-center justify-center py-12 text-gray-400">
      <Icon name="lucide:loader-2" class="h-8 w-8 mb-3 animate-spin" />
      <p class="text-sm">Loading low stock items...</p>
    </div>
  </div>
</template>
<style scoped></style>