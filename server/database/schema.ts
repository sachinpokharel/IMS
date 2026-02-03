import {
  sqliteTable,
  text,
  integer,
  real,
  foreignKey,
  index,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// TAXES
// ============================================================================
export const taxes = sqliteTable('taxes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  rate: real('rate').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

// ============================================================================
// CATEGORIES
// ============================================================================
export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    parentId: text('parent_id'),
    color: text('color').default('#6B7280'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    parentFk: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }),
  })
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parentChild',
  }),
  children: many(categories, { relationName: 'parentChild' }),
  products: many(products),
}));

// ============================================================================
// SUPPLIERS
// ============================================================================
export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country').default('France'),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  supplierPrices: many(supplierPrices),
}));

// ============================================================================
// CUSTOMERS
// ============================================================================
export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').notNull().unique(),
    secondaryPhone: text('secondary_phone'),
    email: text('email'),
    street: text('street'),
    address: text('address'),
    district: text('district'),
    deliveryCharge: real('delivery_charge').default(0),
    babyName: text('baby_name'),
    babyDate: integer('baby_date', { mode: 'timestamp' }),
    babyGender: text('baby_gender'),
    notes: text('notes'),
    customerNo: integer('customer_no').unique(),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    lastPurchaseDate: integer('last_purchase_date', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    phoneIdx: index('customers_phone_idx').on(table.phone),
    customerNoIdx: index('customers_no_idx').on(table.customerNo),
  })
);

export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
  orders: many(orders),
}));

// ============================================================================
// PRODUCTS
// ============================================================================
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').unique(),
  barcode: text('barcode'),
  name: text('name').notNull(),
  description: text('description'),

  categoryId: text('category_id').references(() => categories.id),

  costPrice: real('cost_price').default(0),
  sellingPrice: real('selling_price').default(0),
  marginPercent: real('margin_percent').default(30),

  taxId: text('tax_id').references(() => taxes.id),

  stockQuantity: integer('stock_quantity').default(0),
  stockMin: integer('stock_min').default(0),
  stockMax: integer('stock_max'),

  unit: text('unit').default('unit'),

  supplierId: text('supplier_id').references(() => suppliers.id),

  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  options: text('options', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  tax: one(taxes, {
    fields: [products.taxId],
    references: [taxes.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  supplierPrices: many(supplierPrices),
  stockMovements: many(stockMovements),
  variants: many(productVariants),
}));

// ============================================================================
// PRODUCT VARIANTS
// ============================================================================
export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sku: text('sku'),
  barcode: text('barcode'),

  costPrice: real('cost_price').default(0).notNull(),
  marginPercent: real('margin_percent').default(30),
  price: real('price').default(0).notNull(),

  taxId: text('tax_id').references(() => taxes.id),

  stockQuantity: integer('stock_quantity').default(0),
  stockMin: integer('stock_min').default(0),
  stockMax: integer('stock_max'),

  supplierId: text('supplier_id').references(() => suppliers.id),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    supplier: one(suppliers, {
      fields: [productVariants.supplierId],
      references: [suppliers.id],
    }),
    tax: one(taxes, {
      fields: [productVariants.taxId],
      references: [taxes.id],
    }),
    stockMovements: many(stockMovements),
  })
);

// ============================================================================
// SUPPLIER PRICES (Supplier pricing for a product)
// ============================================================================
export const supplierPrices = sqliteTable('supplier_prices', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  supplierId: text('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'cascade' }),
  price: real('price').notNull(),
  minQuantity: integer('min_quantity').default(1),
  leadTimeDays: integer('lead_time_days'),
  supplierSku: text('supplier_sku'),
  purchaseUrl: text('purchase_url'),
  isPreferred: integer('is_preferred', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

// ============================================================================
// SUPPLIER PRICE HISTORY
// ============================================================================
export const supplierPriceHistory = sqliteTable('supplier_price_history', {
  id: text('id').primaryKey(),
  supplierPriceId: text('supplier_price_id')
    .notNull()
    .references(() => supplierPrices.id, { onDelete: 'cascade' }),
  price: real('price').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  createdBy: text('created_by'),
});

export const supplierPriceHistoryRelations = relations(
  supplierPriceHistory,
  ({ one }) => ({
    supplierPrice: one(supplierPrices, {
      fields: [supplierPriceHistory.supplierPriceId],
      references: [supplierPrices.id],
    }),
  })
);

export const supplierPricesRelations = relations(
  supplierPrices,
  ({ one, many }) => ({
    product: one(products, {
      fields: [supplierPrices.productId],
      references: [products.id],
    }),
    supplier: one(suppliers, {
      fields: [supplierPrices.supplierId],
      references: [suppliers.id],
    }),
    priceHistory: many(supplierPriceHistory),
    variantExclusions: many(variantSupplierExclusions),
  })
);

// ============================================================================
// VARIANT SUPPLIER EXCLUSIONS (to mark which variants are NOT available from which suppliers)
// By default, all variants are available from all product suppliers
// ============================================================================
export const variantSupplierExclusions = sqliteTable(
  'variant_supplier_exclusions',
  {
    id: text('id').primaryKey(),
    variantId: text('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    supplierPriceId: text('supplier_price_id')
      .notNull()
      .references(() => supplierPrices.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  }
);

export const variantSupplierExclusionsRelations = relations(
  variantSupplierExclusions,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [variantSupplierExclusions.variantId],
      references: [productVariants.id],
    }),
    supplierPrice: one(supplierPrices, {
      fields: [variantSupplierExclusions.supplierPriceId],
      references: [supplierPrices.id],
    }),
  })
);

// ============================================================================
// SELLING PRICE HISTORY (to track product selling price changes over time)
// ============================================================================
export const sellingPriceHistory = sqliteTable('selling_price_history', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').references(() => productVariants.id, {
    onDelete: 'cascade',
  }),
  price: real('price').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  createdBy: text('created_by'),
});

export const sellingPriceHistoryRelations = relations(
  sellingPriceHistory,
  ({ one }) => ({
    product: one(products, {
      fields: [sellingPriceHistory.productId],
      references: [products.id],
    }),
    variant: one(productVariants, {
      fields: [sellingPriceHistory.variantId],
      references: [productVariants.id],
    }),
  })
);

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================
export const stockMovements = sqliteTable('stock_movements', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').references(() => productVariants.id),

  type: text('type', {
    enum: ['in', 'out', 'adjustment', 'transfer', 'return'],
  }).notNull(),

  quantity: integer('quantity').notNull(),

  stockBefore: integer('stock_before').notNull(),
  stockAfter: integer('stock_after').notNull(),

  unitCost: real('unit_cost'),

  reference: text('reference'),

  reason: text('reason'),

  supplierId: text('supplier_id').references(() => suppliers.id),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [stockMovements.variantId],
    references: [productVariants.id],
  }),
  supplier: one(suppliers, {
    fields: [stockMovements.supplierId],
    references: [suppliers.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type Tax = typeof taxes.$inferSelect;
export type NewTax = typeof taxes.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;

export type SupplierPrice = typeof supplierPrices.$inferSelect;
export type NewSupplierPrice = typeof supplierPrices.$inferInsert;

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;

export type SupplierPriceHistory = typeof supplierPriceHistory.$inferSelect;
export type NewSupplierPriceHistory = typeof supplierPriceHistory.$inferInsert;

export type VariantSupplierExclusion =
  typeof variantSupplierExclusions.$inferSelect;
export type NewVariantSupplierExclusion =
  typeof variantSupplierExclusions.$inferInsert;

export type SellingPriceHistory = typeof sellingPriceHistory.$inferSelect;
export type NewSellingPriceHistory = typeof sellingPriceHistory.$inferInsert;

// ============================================================================
// USERS
// Roles:
// - admin: Full access, can manage users
// - member: Full access to inventory (read/write), no user management
// - viewer: Read-only access to inventory, no modifications allowed
// ============================================================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'member', 'viewer'] })
    .notNull()
    .default('member'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ============================================================================
// INVOICES
// ============================================================================
export const invoices = sqliteTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    invoiceNumber: text('invoice_number').notNull().unique(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    subtotal: real('subtotal').default(0),
    taxAmount: real('tax_amount').default(0),
    discountAmount: real('discount_amount').default(0),
    deliveryCharge: real('delivery_charge').default(0),
    totalAmount: real('total_amount').default(0),
    status: text('status').default('draft'), // draft, finalized, paid, cancelled
    paymentMethod: text('payment_method'), // bank, cash, cash_on_delivery
    issuedDate: integer('issued_date', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    dueDate: integer('due_date', { mode: 'timestamp' }),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    customerIdx: index('invoices_customer_idx').on(table.customerId),
    statusIdx: index('invoices_status_idx').on(table.status),
  })
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

// ============================================================================
// INVOICE ITEMS
// ============================================================================
export const invoiceItems = sqliteTable('invoice_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  variantId: text('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull().default(0),
  taxRate: real('tax_rate').default(0),
  taxAmount: real('tax_amount').default(0),
  discountAmount: real('discount_amount').default(0),
  lineTotal: real('line_total').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [invoiceItems.variantId],
    references: [productVariants.id],
  }),
}));

// ============================================================================
// PAYMENTS
// ============================================================================
export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    amount: real('amount').notNull(),
    method: text('method').notNull(), // cash, check, bank_transfer, card, other
    paidDate: integer('paid_date', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    reference: text('reference'), // check number, transaction ID, etc.
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    invoiceIdx: index('payments_invoice_idx').on(table.invoiceId),
  })
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

// ============================================================================
// SETTINGS
// ============================================================================
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  businessName: text('business_name').default('OpenStock Inc.'),
  companyName: text('company_name'),
  companyAddress: text('company_address'),
  companyPhone: text('company_phone'),
  companyPan: text('company_pan'),
  companyVat: text('company_vat'),
  companyLogo: text('company_logo'),
  companyFavicon: text('company_favicon'),
  currency: text('currency').default('NPR'),
  defaultMargin: real('default_margin').default(30),
  lowStockAlert: integer('low_stock_alert', { mode: 'boolean' }).default(true),
  outOfStockAlert: integer('out_of_stock_alert', { mode: 'boolean' }).default(
    true
  ),
  emailDailyReport: integer('email_daily_report', { mode: 'boolean' }).default(
    false
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// ============================================================================
// ORDERS
// ============================================================================
export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    orderNumber: text('order_number').notNull().unique(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    subtotal: real('subtotal').default(0),
    taxAmount: real('tax_amount').default(0),
    discountAmount: real('discount_amount').default(0),
    deliveryCharge: real('delivery_charge').default(0),
    totalAmount: real('total_amount').default(0),
    status: text('status').default('pending'), // pending, confirmed, processing, completed, cancelled, delivery_failed
    paymentStatus: text('payment_status').default('unpaid'), // unpaid, partial, paid
    paymentMethod: text('payment_method'), // bank, cash, cash_on_delivery
    orderDate: integer('order_date', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    expectedDeliveryDate: integer('expected_delivery_date', { mode: 'timestamp' }),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    customerIdx: index('orders_customer_idx').on(table.customerId),
    statusIdx: index('orders_status_idx').on(table.status),
  })
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
  shipments: many(shipments),
}));

// ============================================================================
// ORDER ITEMS
// ============================================================================
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  variantId: text('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull().default(0),
  taxRate: real('tax_rate').default(0),
  taxAmount: real('tax_amount').default(0),
  discountAmount: real('discount_amount').default(0),
  lineTotal: real('line_total').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

// ============================================================================
// NOTIFICATIONS
// ============================================================================
export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['warning', 'info', 'success', 'error'] }).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    href: text('href'),
    read: integer('read', { mode: 'boolean' }).default(false),
    // For generated notifications (low stock, etc.)
    generatedId: text('generated_id'), // e.g., "low-stock-product-123"
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    userIdx: index('notifications_user_idx').on(table.userId),
    readIdx: index('notifications_read_idx').on(table.read),
    generatedIdx: index('notifications_generated_idx').on(table.generatedId),
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// ============================================================================
// ACTIVITY LOGS
// ============================================================================
export const activityLogs = sqliteTable(
  'activity_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(), // created, updated, deleted, etc.
    entityType: text('entity_type').notNull(), // product, invoice, order, customer, etc.
    entityId: text('entity_id'), // ID of the affected entity
    entityName: text('entity_name'), // Name/description of the entity
    details: text('details'), // JSON string with additional details
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    userIdx: index('activity_logs_user_idx').on(table.userId),
    entityIdx: index('activity_logs_entity_idx').on(table.entityType, table.entityId),
    createdAtIdx: index('activity_logs_created_at_idx').on(table.createdAt),
  })
);

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

// ============================================================================
// NCM SHIPMENTS
// ============================================================================
export const shipments = sqliteTable(
  'shipments',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    partner: text('partner').notNull().default('NCM'), // Nepal Can Move
    ncmOrderId: text('ncm_order_id'), // NCM's order ID
    trackingId: text('tracking_id').notNull(),
    systemStatus: text('system_status').notNull(), // ORDER_CREATED, PICKED_UP, IN_TRANSIT, etc.
    shippingCharge: real('shipping_charge').default(0), // NPR
    codAmount: real('cod_amount').default(0), // Cash on delivery amount
    recipientName: text('recipient_name').notNull(),
    recipientPhone: text('recipient_phone').notNull(),
    recipientAddress: text('recipient_address').notNull(),
    destinationCity: text('destination_city').notNull(),
    originCity: text('origin_city').notNull(),
    packageDescription: text('package_description'),
    ncmResponse: text('ncm_response'), // JSON string with full NCM API response
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    orderIdx: index('shipments_order_idx').on(table.orderId),
    trackingIdx: index('shipments_tracking_idx').on(table.trackingId),
    statusIdx: index('shipments_status_idx').on(table.systemStatus),
  })
);

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
  events: many(shipmentEvents),
}));

export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;

// ============================================================================
// SHIPMENT EVENTS (tracking history)
// ============================================================================
export const shipmentEvents = sqliteTable(
  'shipment_events',
  {
    id: text('id').primaryKey(),
    shipmentId: text('shipment_id')
      .notNull()
      .references(() => shipments.id, { onDelete: 'cascade' }),
    partnerStatus: text('partner_status').notNull(), // NCM's raw status
    vendorReturn: text('vendor_return'), // "True" or "False" from NCM
    systemStatus: text('system_status').notNull(), // Mapped status
    occurredAt: text('occurred_at'), // Timestamp from NCM
    location: text('location'), // Location from NCM tracking
    raw: text('raw'), // JSON string with full event data
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    shipmentIdx: index('shipment_events_shipment_idx').on(table.shipmentId),
    createdAtIdx: index('shipment_events_created_at_idx').on(table.createdAt),
  })
);

export const shipmentEventsRelations = relations(shipmentEvents, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentEvents.shipmentId],
    references: [shipments.id],
  }),
}));

export type ShipmentEvent = typeof shipmentEvents.$inferSelect;
export type NewShipmentEvent = typeof shipmentEvents.$inferInsert;
