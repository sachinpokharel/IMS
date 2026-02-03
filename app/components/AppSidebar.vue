<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { user, isAdmin, logout } = useAuth();
const { settings } = useSettings();

const isCollapsed = ref(false);

const navigation = [
  { name: 'Dashboard', href: '/', icon: 'lucide:layout-dashboard' },
  { name: 'Products', href: '/products', icon: 'lucide:package' },
  { name: 'Categories', href: '/categories', icon: 'lucide:folder-tree' },
  { name: 'Suppliers', href: '/suppliers', icon: 'lucide:truck' },
  { name: 'Customers', href: '/customers', icon: 'lucide:users' },
  { name: 'Orders', href: '/orders', icon: 'lucide:shopping-cart' },
  { name: 'Invoices', href: '/invoices', icon: 'lucide:receipt' },
  { name: 'Movements', href: '/movements', icon: 'lucide:arrow-left-right' },
];

const secondaryNavigation = computed(() => {
  const items = [
    { name: 'Taxes', href: '/taxes', icon: 'lucide:percent' },
    { name: 'Settings', href: '/settings', icon: 'lucide:settings' },
  ];

  // Add Admin links for admins only
  if (isAdmin.value) {
    items.unshift({ name: 'Activity Logs', href: '/activity-logs', icon: 'lucide:activity' });
    items.unshift({ name: 'Users', href: '/users', icon: 'lucide:users' });
  }

  return items;
});

function isActive(href: string): boolean {
  if (href === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(href);
}

async function handleLogout() {
  try {
    await logout();
  } catch (e) {
    console.error('Logout error:', e);
  } finally {
    // Navigate to login page regardless of logout success/failure
    await router.push('/auth/login');
  }
}
</script>

<template>
  <aside :class="[
    'flex flex-col border-r border-gray-200 bg-white transition-all duration-300',
    'w-16 md:w-20',
    isCollapsed ? 'lg:w-20' : 'lg:w-64',
  ]">
    <!-- Header -->
   <div class="flex h-16 items-center justify-center gap-3 border-b border-gray-100 px-1.5 md:px-2 lg:px-6 lg:justify-start">
    
      <button
        v-if="settings?.company.logo"
        @click="isCollapsed = !isCollapsed"
        class="hidden lg:flex items-center justify-center h-8 w-8 shrink-0 rounded-lg bg-white text-white shadow-sm overflow-hidden hover:opacity-80 transition-opacity"
        :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <img
          :src="settings.company.logo"
          alt="Company logo"
          class="h-full w-full object-cover"
        />
      </button>
      <button
        v-else
        @click="isCollapsed = !isCollapsed"
        class="hidden lg:flex items-center justify-center h-8 w-8 shrink-0 rounded-lg bg-primary-600 text-white shadow-sm hover:bg-primary-700 transition-colors"
        :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <Icon name="lucide:boxes" class="h-5 w-5 lg:h-5 lg:w-5 md:h-6 md:w-6 sm:h-6 sm:w-6" />
      </button>
      <!-- Show logo/icon as regular element on mobile and tablet (not clickable for collapse) -->
      <div
        v-if="settings?.company.logo"
        class="lg:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-white shadow-sm overflow-hidden"
      >
        <img
          :src="settings.company.logo"
          alt="Company logo"
          class="h-full w-full object-cover"
        />
      </div>
      <div
        v-else
        class="lg:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm"
      >
        <Icon name="lucide:boxes" class="h-5 w-5 lg:h-5 lg:w-5 md:h-6 md:w-6 sm:h-6 sm:w-6" />
      </div>
      <div :class="['hidden flex-col transition-all duration-300', !isCollapsed && 'lg:flex']">
        >
        <span
          class="text-[10px] font-medium text-gray-500 uppercase tracking-wider"
          >Inventory</span
        >
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
      <!-- Main navigation -->
      <div class="flex flex-col gap-1">
        <NuxtLink
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          class="group flex items-center justify-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 lg:justify-start"
          :class="[
            isActive(item.href)
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          ]"
          :title="item.name"
        >
          <Icon
            :name="item.icon"
            class="shrink-0 transition-colors h-6 w-6 lg:h-5 lg:w-5"
            :class="
              isActive(item.href)
                ? 'text-primary-600'
                : 'text-gray-400 group-hover:text-gray-600'
            "
          />
          <span :class="['hidden transition-all duration-300', !isCollapsed && 'lg:inline']">{{ item.name }}</span>
          <div
            v-if="isActive(item.href)"
            :class="['hidden ml-auto h-1.5 w-1.5 rounded-full bg-primary-600 transition-all duration-300', !isCollapsed && 'lg:block']"
          />
        </NuxtLink>
      </div>

      <!-- Separator -->
      <div :class="['my-4 h-px bg-gray-100 hidden transition-all duration-300', !isCollapsed && 'lg:block']" />

      <!-- Secondary navigation -->
      <div class="flex flex-col gap-1">
        <p
          :class="['hidden px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 transition-all duration-300', !isCollapsed && 'lg:block']"
        >
          System
        </p>
        <NuxtLink
          v-for="item in secondaryNavigation"
          :key="item.name"
          :to="item.href"
          class="group flex items-center justify-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 lg:justify-start"
          :class="[
            isActive(item.href)
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          ]"
          :title="item.name"
        >
          <Icon
            :name="item.icon"
            class="shrink-0 transition-colors h-6 w-6 lg:h-5 lg:w-5"
            :class="
              isActive(item.href)
                ? 'text-primary-600'
                : 'text-gray-400 group-hover:text-gray-600'
            "
          />
          <span :class="['hidden transition-all duration-300', !isCollapsed && 'lg:inline']">{{ item.name }}</span>
        </NuxtLink>
      </div>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- User Card -->
      <div :class="['mt-4 rounded-xl border border-gray-100 bg-gray-50/50 p-3 hidden transition-all duration-300', !isCollapsed && 'lg:block']">
        <div class="flex items-center gap-3">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100"
          >
            <Icon name="lucide:user" class="h-5 w-5 text-gray-600" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="truncate text-sm font-semibold text-gray-900">
              {{ user?.name || 'User' }}
            </p>
            <p class="truncate text-xs text-gray-500">{{ user?.email }}</p>
          </div>
          <button
            @click="handleLogout"
            class="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            title="Sign out"
          >
            <Icon name="lucide:log-out" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Mobile User/Logout Button -->
      <div class="flex lg:hidden justify-center py-2">
        <button
          @click="handleLogout"
          class="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          title="Sign out"
        >
          <Icon name="lucide:log-out" class="h-5 w-5" />
        </button>
      </div>
    </nav>
  </aside>
</template>
