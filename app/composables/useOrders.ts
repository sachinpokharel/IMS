export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: any;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  deliveryCharge: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  notes?: string;
  items?: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  product?: any;
  variant?: any;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
}

export interface CreateOrderData {
  customerId: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
  }>;
  discountAmount?: number;
  deliveryCharge?: number;
  expectedDeliveryDate?: number;
  notes?: string;
  paymentMethod?: string;
  status?: string;
}

export interface UpdateOrderData {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  expectedDeliveryDate?: number;
  notes?: string;
  discountAmount?: number;
  deliveryCharge?: number;
}

export const useOrders = () => {
  const orders = useState<Order[]>('orders', () => []);
  const loading = useState<boolean>('orders-loading', () => false);

  const fetchOrders = async (filters?: { status?: string; customerId?: string }) => {
    loading.value = true;
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.customerId) params.append('customerId', filters.customerId);

      const data = await $fetch<Order[]>(`/api/orders?${params.toString()}`);
      orders.value = data;
      return data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const fetchOrder = async (id: string) => {
    try {
      const data = await $fetch<Order>(`/api/orders/${id}`);
      return data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  };

  const createOrder = async (orderData: CreateOrderData) => {
    try {
      const data = await $fetch<Order>('/api/orders', {
        method: 'POST',
        body: orderData,
      });
      // Refresh orders list
      await fetchOrders();
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const updateOrder = async (id: string, orderData: UpdateOrderData) => {
    try {
      const data = await $fetch<Order>(`/api/orders/${id}`, {
        method: 'PUT',
        body: orderData,
      });
      // Refresh orders list
      await fetchOrders();
      return data;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await $fetch(`/api/orders/${id}`, {
        method: 'DELETE',
      });
      // Refresh orders list
      await fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  };

  return {
    orders,
    loading,
    fetchOrders,
    fetchOrder,
    createOrder,
    updateOrder,
    deleteOrder,
  };
};
