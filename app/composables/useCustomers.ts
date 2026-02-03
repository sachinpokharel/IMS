export interface Customer {
  id: string;
  name: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  street?: string;
  address?: string;
  district?: string;
  deliveryCharge?: number;
  babyName?: string;
  babyDate?: number;
  babyGender?: string;
  notes?: string;
  createdAt?: number;
  lastPurchaseDate?: number;
  updatedAt?: number;
}

export const useCustomers = () => {
  const customers = ref<Customer[]>([]);

  const selectedCustomer = ref<Customer | null>(null);

  async function fetchCustomers(search: string = '') {
    const result = await $fetch<Customer[]>('/api/customers', {
      query: { search },
    });
    customers.value = result;
    return result;
  }

  async function getCustomer(id: string) {
    return $fetch<Customer>(`/api/customers/${id}`);
  }

  async function createCustomer(data: Omit<Customer, 'id'>) {
    const customer = await $fetch<Customer>('/api/customers', {
      method: 'POST',
      body: data,
    });
    await fetchCustomers();
    return customer;
  }

  async function updateCustomer(id: string, data: Partial<Customer>) {
    const updated = await $fetch<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      body: data,
    });
    await fetchCustomers();
    return updated;
  }

  async function deleteCustomer(id: string) {
    await $fetch(`/api/customers/${id}`, {
      method: 'DELETE',
    });
    await fetchCustomers();
  }

  return {
    customers,
    selectedCustomer,
    fetchCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
};
