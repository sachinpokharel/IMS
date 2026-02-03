export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  lineTotal?: number;
  product?: any;
  variant?: any;
  createdAt?: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  paidDate: number;
  reference?: string;
  notes?: string;
  createdAt?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  deliveryCharge: number;
  totalAmount: number;
  status: 'draft' | 'finalized' | 'paid' | 'cancelled';
  paymentMethod?: 'bank' | 'cash' | 'cash_on_delivery';
  issuedDate: number;
  dueDate?: number;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
  customer?: any;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export const useInvoices = () => {
  const { data: invoices, refresh } = useAsyncData<Invoice[]>(
    'invoices',
    () => $fetch('/api/invoices')
  );

  async function fetchInvoices(status: string = 'all') {
    return $fetch<Invoice[]>('/api/invoices', {
      query: { status },
    });
  }

  async function getInvoice(id: string) {
    return $fetch<Invoice>(`/api/invoices/${id}`);
  }

  async function createInvoice(data: {
    customerId: string;
    items: InvoiceItem[];
    discountAmount?: number;
    dueDate?: number;
    notes?: string;
  }) {
    const invoice = await $fetch<Invoice>('/api/invoices', {
      method: 'POST',
      body: data,
    });
    await refresh();
    return invoice;
  }

  async function updateInvoice(
    id: string,
    data: {
      status?: string;
      dueDate?: number;
      notes?: string;
      discountAmount?: number;
    }
  ) {
    const updated = await $fetch<Invoice>(`/api/invoices/${id}`, {
      method: 'PUT',
      body: data,
    });
    await refresh();
    return updated;
  }

  async function recordPayment(
    invoiceId: string,
    data: {
      amount: number;
      method: string;
      reference?: string;
      notes?: string;
    }
  ) {
    return $fetch<Payment>(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: data,
    });
  }

  return {
    invoices,
    fetchInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    recordPayment,
    refresh,
  };
};
