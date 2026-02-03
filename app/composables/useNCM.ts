// NCM (Nepal Can Move) delivery integration composable

export interface NcmCity {
  id: string;
  name: string;
  // Add other fields based on actual NCM API response
}

export interface NcmShippingRate {
  charge: number;
  destination: string;
  origin: string;
  // Add other fields based on actual NCM API response
}

export interface Shipment {
  id: string;
  orderId: string;
  partner: string;
  ncmOrderId?: string;
  trackingId: string;
  systemStatus: string;
  shippingCharge: number;
  codAmount: number;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  destinationCity: string;
  originCity: string;
  packageDescription?: string;
  ncmResponse?: string;
  createdAt: Date;
  updatedAt: Date;
  order?: any;
  events?: ShipmentEvent[];
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  partnerStatus: string;
  vendorReturn?: string;
  systemStatus: string;
  occurredAt?: string;
  location?: string;
  raw?: string;
  createdAt: Date;
}

export interface CreateShipmentData {
  orderId: string;
  destinationCity: string;
}

export const useNCM = () => {
  const cities = useState<NcmCity[]>('ncm-cities', () => []);
  const loading = useState<boolean>('ncm-loading', () => false);

  /**
   * Fetch list of available NCM cities/branches
   */
  const fetchCities = async () => {
    loading.value = true;
    try {
      const response = await $fetch<{ success: boolean; data: NcmCity[] }>(
        '/api/ncm/cities'
      );
      cities.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Error fetching NCM cities:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Get shipping cost for a destination
   */
  const getShippingCost = async (destinationCity: string) => {
    try {
      const response = await $fetch<{
        success: boolean;
        data: NcmShippingRate;
      }>(`/api/ncm/shipping-cost?destination=${destinationCity}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching shipping cost:', error);
      throw error;
    }
  };

  /**
   * Create a new NCM shipment for an order
   */
  const createShipment = async (data: CreateShipmentData) => {
    loading.value = true;
    try {
      const response = await $fetch<{
        success: boolean;
        data: {
          shipmentId: string;
          trackingId: string;
          systemStatus: string;
          shippingCharge: number;
          ncmResponse: any;
        };
      }>('/api/ncm/create', {
        method: 'POST',
        body: data,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating NCM shipment:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Track a shipment by tracking ID
   */
  const trackShipment = async (trackingId: string) => {
    loading.value = true;
    try {
      const response = await $fetch<{
        success: boolean;
        data: {
          shipment: Shipment;
          ncmStatus?: any;
          cached?: boolean;
        };
      }>(`/api/ncm/track?trackingId=${trackingId}`);
      return response.data;
    } catch (error) {
      console.error('Error tracking shipment:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Get human-readable status label
   */
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      ORDER_CREATED: 'Order Created',
      PICKED_UP: 'Picked Up',
      IN_TRANSIT: 'In Transit',
      ARRIVED_AT_DESTINATION_HUB: 'Arrived at Destination',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED: 'Delivered',
      DELIVERY_FAILED: 'Delivery Failed',
      RTO_IN_TRANSIT: 'Returning to Sender',
      RETURNED_TO_SENDER: 'Returned',
    };
    return labels[status] || status;
  };

  /**
   * Get status color for UI
   */
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      ORDER_CREATED: 'gray',
      PICKED_UP: 'blue',
      IN_TRANSIT: 'blue',
      ARRIVED_AT_DESTINATION_HUB: 'purple',
      OUT_FOR_DELIVERY: 'yellow',
      DELIVERED: 'green',
      DELIVERY_FAILED: 'red',
      RTO_IN_TRANSIT: 'orange',
      RETURNED_TO_SENDER: 'red',
    };
    return colors[status] || 'gray';
  };

  return {
    cities,
    loading,
    fetchCities,
    getShippingCost,
    createShipment,
    trackShipment,
    getStatusLabel,
    getStatusColor,
  };
};
