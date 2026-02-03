// Nepal Can Move (NCM) API client

type NcmConfig = {
  apiUrl: string;
  apiKey: string;
};

export function createNcmClient(cfg: NcmConfig) {
  const baseURL = cfg.apiUrl.replace(/\/$/, '');
  const headers = {
    Authorization: `Token ${cfg.apiKey}`,
  };

  return {
    /**
     * Get list of all NCM branch/city locations
     */
    async branchList() {
      return await $fetch(`${baseURL}/branchlist`, { headers });
    },

    /**
     * Get shipping rate for a specific route
     */
    async shippingRate(params: {
      creation: string;
      destination: string;
      type: string;
    }) {
      return await $fetch(`${baseURL}/shipping-rate`, {
        headers,
        query: params,
      });
    },

    /**
     * Create a new delivery order with NCM
     */
    async createOrder(body: {
      name: string;
      phone: string;
      phone2?: string;
      address: string;
      cod_charge: number;
      fbranch: string;
      branch: string;
      package: string;
    }) {
      return await $fetch(`${baseURL}/order/create`, {
        method: 'POST',
        headers,
        body,
      });
    },

    /**
     * Get tracking status for an order
     */
    async orderStatus(id: string) {
      return await $fetch(`${baseURL}/order/status`, {
        headers,
        query: { id },
      });
    },
  };
}
