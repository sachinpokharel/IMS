<script setup lang="ts">
import logoPlaceholderUrl from '~/assets/images/logo-placeholder.svg?url';

const loading = ref(false);
const { settings: fetchedSettings, updateSettings } = useSettings();
const { isAdmin } = useAuth();
const isBackingUp = ref(false);

const settings = ref<{
  businessName: string;
  currency: 'USD' | 'NPR';
  company: {
    name: string;
    address: string;
    phone: string;
    pan: string;
    vat: string;
    logo: string;
    favicon: string;
  };
  defaultMargin: number;
  stockAlerts: {
    lowStock: boolean;
    outOfStock: boolean;
    emailDaily: boolean;
  };
} | null>(null);

watch(
  fetchedSettings,
  (newVal) => {
    if (newVal) {
      settings.value = JSON.parse(JSON.stringify(newVal));
    }
  },
  { immediate: true }
);

async function downloadDbBackup() {
  if (isBackingUp.value) return;
  isBackingUp.value = true;

  try {
    const toast = useToast();
    const res = await fetch('/api/admin/backup');
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(msg || `Backup failed (${res.status})`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const stamp = new Date()
      .toISOString()
      .replace('T', '_')
      .replace(/\..+$/, '')
      .replace(/:/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `openstock-db_${stamp}.sqlite.gz`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast.success('Backup downloaded', `Saved as ${a.download}`);
  } catch (e: any) {
    const toast = useToast();
    toast.error('Backup failed', e?.message || 'Unknown error');
  } finally {
    isBackingUp.value = false;
  }
}

async function saveSettings() {
  if (!settings.value) return;

  loading.value = true;
  const success = await updateSettings(settings.value);
  loading.value = false;

  if (success) {
    const toast = useToast();
    toast.success('Configuration saved', 'Your settings have been updated.');
  } else {
    const toast = useToast();
    toast.error('Error', 'Failed to save settings.');
  }
}

async function handleLogoSelected(e: Event) {
  if (!settings.value) return;
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0] || null;
  input.value = '';
  if (!file) return;

  // Validate file size (logos should be reasonable, max 500KB)
  const maxSize = 500 * 1024; // 500KB
  if (file.size > maxSize) {
    const toast = useToast();
    toast.error('File too large', 'Logo should be smaller than 500KB. Please optimize your image.');
    return;
  }

  // Read file as data URL, then upload
  const reader = new FileReader();
  reader.onerror = () => {
    const toast = useToast();
    toast.error('Upload failed', 'Failed to read logo file');
  };
  reader.onload = async () => {
    const toast = useToast();
    try {
      const dataUrl = String(reader.result || '');
      
      // Upload to server
      const response = await $fetch('/api/upload/logo', {
        method: 'POST',
        body: {
          filename: file.name,
          data: dataUrl,
        },
      });

      if (response.success && response.path) {
        settings.value!.company.logo = response.path;
        toast.success('Logo uploaded', 'Click "Save Changes" to apply');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Upload failed', 'Failed to upload logo to server');
    }
  };
  reader.readAsDataURL(file);
}

async function handleFaviconSelected(e: Event) {
  if (!settings.value) return;
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0] || null;
  input.value = '';
  if (!file) return;

  // Validate file size (favicons should be small, max 100KB)
  const maxSize = 100 * 1024; // 100KB
  if (file.size > maxSize) {
    const toast = useToast();
    toast.error('File too large', 'Favicon should be smaller than 100KB. Please optimize your image.');
    return;
  }

  // Read file as data URL, then upload
  const reader = new FileReader();
  reader.onerror = () => {
    const toast = useToast();
    toast.error('Upload failed', 'Failed to read favicon file');
  };
  reader.onload = async () => {
    const toast = useToast();
    try {
      const dataUrl = String(reader.result || '');
      
      // Upload to server
      const response = await $fetch('/api/upload/favicon', {
        method: 'POST',
        body: {
          filename: file.name,
          data: dataUrl,
        },
      });

      if (response.success && response.path) {
        settings.value!.company.favicon = response.path;
        toast.success('Favicon uploaded', 'Click "Save Changes" to apply');
      }
    } catch (error) {
      console.error('Favicon upload error:', error);
      toast.error('Upload failed', 'Failed to upload favicon to server');
    }
  };
  reader.readAsDataURL(file);
}

function usePlaceholderLogo() {
  if (!settings.value) return;
  settings.value.company.logo = logoPlaceholderUrl;
}

const ui = {
  card: 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden',
  cardHeader:
    'px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between',
  cardTitle: 'text-xs font-bold text-gray-700 uppercase tracking-wider',
  cardBody: 'p-5',
  label:
    'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5',
  input:
    'block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm h-9 placeholder:text-gray-300 transition-shadow',
  inputSelect:
    'block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm h-9 bg-white',
  switchBase:
    'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2',
  switchActive: 'bg-gray-900',
  switchInactive: 'bg-gray-200',
  switchKnob:
    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
  switchKnobActive: 'translate-x-4',
  switchKnobInactive: 'translate-x-0',
};
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          Settings
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          Manage your workspace preferences and defaults.
        </p>
      </div>
      <button
        @click="saveSettings"
        :disabled="loading"
        class="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Icon
          v-if="loading"
          name="lucide:loader-2"
          class="h-4 w-4 animate-spin"
        />
        <Icon v-else name="lucide:save" class="h-4 w-4" />
        Save Changes
      </button>
    </div>

    <div class="grid gap-6 lg:grid-cols-12">
      <div v-if="settings" class="lg:col-span-8 space-y-6">
        <div :class="ui.card">
          <div :class="ui.cardHeader">
            <h2 :class="ui.cardTitle">General Configuration</h2>
            <Icon name="lucide:settings-2" class="h-4 w-4 text-gray-400" />
          </div>
          <div :class="ui.cardBody">
            <div class="grid gap-5 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label :class="ui.label">Workspace Name</label>
                <input
                  v-model="settings.businessName"
                  type="text"
                  :class="ui.input"
                  placeholder="Ex: My Awesome Shop"
                />
              </div>

              <div class="sm:col-span-2">
                <label :class="ui.label">Company Name</label>
                <input
                  v-model="settings.company.name"
                  type="text"
                  :class="ui.input"
                  placeholder="Ex: OpenStock Pvt. Ltd."
                />
              </div>

              <div class="sm:col-span-2">
                <label :class="ui.label">Company Address</label>
                <input
                  v-model="settings.company.address"
                  type="text"
                  :class="ui.input"
                  placeholder="Street, City, Country"
                />
              </div>

              <div>
                <label :class="ui.label">Phone</label>
                <input
                  v-model="settings.company.phone"
                  type="tel"
                  :class="ui.input"
                  placeholder="+977..."
                />
              </div>

              <div>
                <label :class="ui.label">PAN</label>
                <input
                  v-model="settings.company.pan"
                  type="text"
                  :class="ui.input"
                  placeholder="PAN"
                />
              </div>

              <div>
                <label :class="ui.label">VAT</label>
                <input
                  v-model="settings.company.vat"
                  type="text"
                  :class="ui.input"
                  placeholder="VAT"
                />
              </div>

              <div class="sm:col-span-2">
                <label :class="ui.label">Logo</label>
                <div class="flex items-center gap-4">
                  <div
                    class="h-12 w-12 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden"
                  >
                    <img
                      v-if="settings.company.logo"
                      :src="settings.company.logo"
                      alt="Company logo"
                      class="h-full w-full object-cover"
                    />
                    <Icon
                      v-else
                      name="lucide:image"
                      class="h-5 w-5 text-gray-300"
                    />
                  </div>
                  <div class="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      class="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-black"
                      @change="handleLogoSelected"
                    />
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="text-xs font-semibold text-gray-600 hover:text-gray-900 underline"
                        @click="usePlaceholderLogo"
                      >
                        Use placeholder logo
                      </button>
                    </div>
                  </div>
                </div>
                <p class="mt-1 text-xs text-gray-400">
                  Logo is stored at <span class="font-mono">/public/uploads/logos/</span> (max 500KB).
                </p>
              </div>

              <div class="sm:col-span-2">
                <label :class="ui.label">Favicon</label>
                <div class="flex items-center gap-4">
                  <div
                    class="h-12 w-12 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden"
                  >
                    <img
                      v-if="settings.company.favicon"
                      :src="settings.company.favicon"
                      alt="Company favicon"
                      class="h-full w-full object-cover"
                    />
                    <Icon
                      v-else
                      name="lucide:image"
                      class="h-5 w-5 text-gray-300"
                    />
                  </div>
                  <div class="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      class="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-black"
                      @change="handleFaviconSelected"
                    />
                    <p class="text-xs text-gray-400">
                      PNG, ICO, or SVG (max 100KB, recommended 32x32px). Stored at <span class="font-mono">/public/uploads/favicons/</span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label :class="ui.label">Currency</label>
                <select v-model="settings.currency" :class="ui.inputSelect">
                  <option value="USD">US Dollar ($)</option>
                  <option value="NPR">Nepalese Rupee (NPR)</option>
                </select>
              </div>

              <div>
                <label :class="ui.label">Default Margin</label>
                <div class="relative rounded-md shadow-sm">
                  <input
                    v-model="settings.defaultMargin"
                    type="number"
                    :class="[ui.input, 'pr-8 font-mono']"
                  />
                  <div
                    class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    <span class="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <NuxtLink
            to="/taxes"
            class="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-md bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 transition-colors"
              >
                <Icon
                  name="lucide:percent"
                  class="h-4 w-4 text-gray-500 group-hover:text-gray-900"
                />
              </div>
              <Icon
                name="lucide:arrow-right"
                class="h-4 w-4 text-gray-300 group-hover:text-gray-600 -rotate-45 group-hover:rotate-0 transition-transform duration-300"
              />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Tax Rules</h3>
              <p class="text-xs text-gray-500 mt-1">
                Manage VAT & regional taxes.
              </p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/categories"
            class="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-md bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 transition-colors"
              >
                <Icon
                  name="lucide:folder-tree"
                  class="h-4 w-4 text-gray-500 group-hover:text-gray-900"
                />
              </div>
              <Icon
                name="lucide:arrow-right"
                class="h-4 w-4 text-gray-300 group-hover:text-gray-600 -rotate-45 group-hover:rotate-0 transition-transform duration-300"
              />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Categories</h3>
              <p class="text-xs text-gray-500 mt-1">Organize your inventory.</p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/suppliers"
            class="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-md bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 transition-colors"
              >
                <Icon
                  name="lucide:truck"
                  class="h-4 w-4 text-gray-500 group-hover:text-gray-900"
                />
              </div>
              <Icon
                name="lucide:arrow-right"
                class="h-4 w-4 text-gray-300 group-hover:text-gray-600 -rotate-45 group-hover:rotate-0 transition-transform duration-300"
              />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Suppliers</h3>
              <p class="text-xs text-gray-500 mt-1">Manage vendor directory.</p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <div class="lg:col-span-4 space-y-6">
        <div v-if="settings" :class="ui.card">
          <div :class="ui.cardHeader">
            <h2 :class="ui.cardTitle">Notifications</h2>
            <Icon name="lucide:bell" class="h-4 w-4 text-gray-400" />
          </div>

          <div class="divide-y divide-gray-100">
            <div class="flex items-center justify-between p-4">
              <div class="flex-1 pr-4">
                <p class="text-sm font-medium text-gray-900">Low Stock Alert</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  Notify when items reach min level.
                </p>
              </div>
              <button
                type="button"
                class="group"
                @click="
                  settings.stockAlerts.lowStock = !settings.stockAlerts.lowStock
                "
              >
                <span
                  :class="[
                    settings.stockAlerts.lowStock
                      ? ui.switchActive
                      : ui.switchInactive,
                    ui.switchBase,
                  ]"
                >
                  <span
                    :class="[
                      settings.stockAlerts.lowStock
                        ? ui.switchKnobActive
                        : ui.switchKnobInactive,
                      ui.switchKnob,
                    ]"
                  />
                </span>
              </button>
            </div>

            <div class="flex items-center justify-between p-4">
              <div class="flex-1 pr-4">
                <p class="text-sm font-medium text-gray-900">Out of Stock</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  Critical alert when stock is 0.
                </p>
              </div>
              <button
                type="button"
                class="group"
                @click="
                  settings.stockAlerts.outOfStock =
                    !settings.stockAlerts.outOfStock
                "
              >
                <span
                  :class="[
                    settings.stockAlerts.outOfStock
                      ? ui.switchActive
                      : ui.switchInactive,
                    ui.switchBase,
                  ]"
                >
                  <span
                    :class="[
                      settings.stockAlerts.outOfStock
                        ? ui.switchKnobActive
                        : ui.switchKnobInactive,
                      ui.switchKnob,
                    ]"
                  />
                </span>
              </button>
            </div>
          </div>

          <div class="bg-gray-50 px-4 py-3 border-t border-gray-100">
            <p class="text-xs text-gray-500 text-center">
              Alerts are sent to
              <span class="font-medium text-gray-900">admin@openstock.io</span>
            </p>
          </div>
        </div>

        <div v-if="isAdmin" :class="ui.card">
          <div :class="ui.cardHeader">
            <h2 :class="ui.cardTitle">Data Management</h2>
            <Icon name="lucide:database" class="h-4 w-4 text-gray-400" />
          </div>
          <div class="p-4">
            <button
              @click="downloadDbBackup"
              :disabled="isBackingUp"
              class="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-200 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Icon
                v-if="isBackingUp"
                name="lucide:loader-2"
                class="h-4 w-4 animate-spin"
              />
              <Icon v-else name="lucide:download" class="h-4 w-4" />
              {{ isBackingUp ? 'Preparing backup…' : 'Backup Database' }}
            </button>
            <p class="mt-2 text-xs text-gray-500">
              Downloads a gzipped SQLite backup of your local database.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
