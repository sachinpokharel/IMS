// API response shape (flat)
interface ApiSettings {
  id: number;
  businessName: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyPan?: string | null;
  companyVat?: string | null;
  companyLogo?: string | null;
  companyFavicon?: string | null;
  currency: string | null;
  defaultMargin: number | null;
  lowStockAlert: boolean | number | null;
  outOfStockAlert: boolean | number | null;
  emailDailyReport: boolean | number | null;
  updatedAt: string | null;
}

// Frontend shape (nested for UI)
export interface Settings {
  businessName: string;
  currency: 'USD' | 'NPR';
  company: {
    name: string;
    address: string;
    phone: string;
    pan: string;
    vat: string;
    logo: string; // data URL or remote URL
    favicon: string; // data URL or remote URL
  };
  defaultMargin: number;
  stockAlerts: {
    lowStock: boolean;
    outOfStock: boolean;
    emailDaily: boolean;
  };
}

// Transform API response to frontend shape
function transformFromApi(api: ApiSettings): Settings {
  return {
    businessName: api.businessName ?? 'OpenStock Inc.',
    currency: (api.currency as Settings['currency']) ?? 'NPR',
    company: {
      name: api.companyName ?? api.businessName ?? 'OpenStock Inc.',
      address: api.companyAddress ?? '',
      phone: api.companyPhone ?? '',
      pan: api.companyPan ?? '',
      vat: api.companyVat ?? '',
      logo: api.companyLogo ?? '',
      favicon: api.companyFavicon ?? '',
    },
    defaultMargin: api.defaultMargin ?? 30,
    stockAlerts: {
      lowStock: Boolean(api.lowStockAlert),
      outOfStock: Boolean(api.outOfStockAlert),
      emailDaily: Boolean(api.emailDailyReport),
    },
  };
}

// Transform frontend shape to API payload
function transformToApi(settings: Settings): Partial<ApiSettings> {
  return {
    businessName: settings.businessName,
    companyName: settings.company.name,
    companyAddress: settings.company.address,
    companyPhone: settings.company.phone,
    companyPan: settings.company.pan,
    companyVat: settings.company.vat,
    companyLogo: settings.company.logo,
    companyFavicon: settings.company.favicon,
    currency: settings.currency,
    defaultMargin: settings.defaultMargin,
    lowStockAlert: settings.stockAlerts.lowStock,
    outOfStockAlert: settings.stockAlerts.outOfStock,
    emailDailyReport: settings.stockAlerts.emailDaily,
  };
}

export const useSettings = () => {
  const { data: rawSettings, refresh } = useAsyncData<ApiSettings>(
    'settings',
    () => $fetch('/api/settings')
  );

  // Transform raw API data to frontend shape
  const settings = computed<Settings | null>(() => {
    if (!rawSettings.value) return null;
    return transformFromApi(rawSettings.value);
  });

  const currencySymbol = computed(() => {
    switch (settings.value?.currency) {
      case 'USD':
        return '$';
      case 'NPR':
        return 'रु';
      default:
        return 'रु';
    }
  });

  const currencyIcon = computed(() => {
    switch (settings.value?.currency) {
      case 'USD':
        return 'lucide:dollar-sign';
      case 'NPR':
        return 'lucide:banknote';
      default:
        return 'lucide:banknote';
    }
  });

  async function updateSettings(newSettings: Settings) {
    try {
      await $fetch('/api/settings', {
        method: 'POST',
        body: transformToApi(newSettings),
      });
      await refresh();
      return true;
    } catch (e) {
      console.error('Failed to save settings', e);
      return false;
    }
  }

  return {
    settings,
    currencySymbol,
    currencyIcon,
    updateSettings,
    refresh,
  };
};
