type D1LikeDatabase = {
  prepare: (sql: string) => {
    run: () => Promise<unknown>;
  };
};

export async function applyMigrations(db: D1LikeDatabase) {
  const createStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      name text NOT NULL,
      role text NOT NULL DEFAULT 'member',
      is_active integer DEFAULT 1,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS taxes (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      rate real NOT NULL,
      is_default integer DEFAULT 0,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS suppliers (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      email text,
      phone text,
      address text,
      city text,
      postal_code text,
      country text DEFAULT 'France',
      notes text,
      is_active integer DEFAULT 1,
      created_at integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      description text,
      parent_id text,
      color text DEFAULT '#6B7280',
      created_at integer,
      updated_at integer,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id text PRIMARY KEY NOT NULL,
      sku text,
      barcode text,
      name text NOT NULL,
      description text,
      category_id text,
      cost_price real DEFAULT 0,
      selling_price real DEFAULT 0,
      margin_percent real DEFAULT 30,
      tax_id text,
      stock_quantity integer DEFAULT 0,
      stock_min integer DEFAULT 0,
      stock_max integer,
      unit text DEFAULT 'unit',
      supplier_id text,
      is_active integer DEFAULT 1,
      options text,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (tax_id) REFERENCES taxes(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products (sku)`,
    `CREATE TABLE IF NOT EXISTS product_variants (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      name text NOT NULL,
      sku text,
      barcode text,
      cost_price real DEFAULT 0,
      margin_percent real DEFAULT 30,
      price real DEFAULT 0,
      tax_id text,
      stock_quantity integer DEFAULT 0,
      stock_min integer DEFAULT 0,
      stock_max integer,
      supplier_id text,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (tax_id) REFERENCES taxes(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      variant_id text,
      type text NOT NULL,
      quantity integer NOT NULL,
      stock_before integer NOT NULL,
      stock_after integer NOT NULL,
      unit_cost real,
      reference text,
      reason text,
      supplier_id text,
      created_at integer,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_prices (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      supplier_id text NOT NULL,
      price real NOT NULL,
      min_quantity integer DEFAULT 1,
      lead_time_days integer,
      supplier_sku text,
      purchase_url text,
      is_preferred integer DEFAULT 0,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_price_history (
      id text PRIMARY KEY NOT NULL,
      supplier_price_id text NOT NULL,
      price real NOT NULL,
      created_at integer,
      created_by text,
      FOREIGN KEY (supplier_price_id) REFERENCES supplier_prices(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS selling_price_history (
      id text PRIMARY KEY NOT NULL,
      product_id text NOT NULL,
      variant_id text,
      price real NOT NULL,
      created_at integer,
      created_by text,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS variant_supplier_exclusions (
      id text PRIMARY KEY NOT NULL,
      variant_id text NOT NULL,
      supplier_price_id text NOT NULL,
      created_at integer,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (supplier_price_id) REFERENCES supplier_prices(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id integer PRIMARY KEY NOT NULL,
      business_name text DEFAULT 'OpenStock Inc.',
      company_name text,
      company_address text,
      company_phone text,
      company_pan text,
      company_vat text,
      company_logo text,
      company_favicon text,
      currency text DEFAULT 'NPR',
      default_margin real DEFAULT 30,
      low_stock_alert integer DEFAULT 1,
      out_of_stock_alert integer DEFAULT 1,
      email_daily_report integer DEFAULT 0,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      phone text NOT NULL UNIQUE,
      secondary_phone text,
      street text,
      address text,
      district text,
      created_at integer,
      last_purchase_date integer,
      updated_at integer
    )`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id text PRIMARY KEY NOT NULL,
      invoice_number text NOT NULL UNIQUE,
      customer_id text NOT NULL,
      subtotal real DEFAULT 0,
      tax_amount real DEFAULT 0,
      discount_amount real DEFAULT 0,
      delivery_charge real DEFAULT 0,
      total_amount real DEFAULT 0,
      status text DEFAULT 'draft',
      issued_date integer,
      due_date integer,
      notes text,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS invoice_items (
      id text PRIMARY KEY NOT NULL,
      invoice_id text NOT NULL,
      product_id text NOT NULL,
      variant_id text,
      quantity integer NOT NULL DEFAULT 1,
      unit_price real NOT NULL DEFAULT 0,
      tax_rate real DEFAULT 0,
      tax_amount real DEFAULT 0,
      discount_amount real DEFAULT 0,
      line_total real DEFAULT 0,
      created_at integer,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id text PRIMARY KEY NOT NULL,
      invoice_id text NOT NULL,
      amount real NOT NULL,
      method text NOT NULL,
      paid_date integer,
      reference text,
      notes text,
      created_at integer,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id text PRIMARY KEY NOT NULL,
      order_number text NOT NULL UNIQUE,
      customer_id text NOT NULL,
      subtotal real DEFAULT 0,
      tax_amount real DEFAULT 0,
      discount_amount real DEFAULT 0,
      delivery_charge real DEFAULT 0,
      total_amount real DEFAULT 0,
      status text DEFAULT 'pending',
      payment_status text DEFAULT 'unpaid',
      payment_method text,
      order_date integer,
      expected_delivery_date integer,
      notes text,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id text PRIMARY KEY NOT NULL,
      order_id text NOT NULL,
      product_id text NOT NULL,
      variant_id text,
      quantity integer NOT NULL DEFAULT 1,
      unit_price real NOT NULL DEFAULT 0,
      tax_rate real DEFAULT 0,
      tax_amount real DEFAULT 0,
      discount_amount real DEFAULT 0,
      line_total real DEFAULT 0,
      created_at integer,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      type text NOT NULL,
      title text NOT NULL,
      description text,
      href text,
      read integer DEFAULT 0,
      generated_id text,
      created_at integer,
      FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read)`,
    `CREATE INDEX IF NOT EXISTS notifications_generated_idx ON notifications(generated_id)`,
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id text,
      entity_name text,
      details text,
      ip_address text,
      user_agent text,
      created_at integer,
      FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON activity_logs(user_id)`,
    `CREATE INDEX IF NOT EXISTS activity_logs_entity_idx ON activity_logs(entity_type, entity_id)`,
    `CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at)`,
    `CREATE TABLE IF NOT EXISTS shipments (
      id text PRIMARY KEY NOT NULL,
      order_id text NOT NULL,
      partner text NOT NULL DEFAULT 'NCM',
      ncm_order_id text,
      tracking_id text NOT NULL,
      system_status text NOT NULL,
      shipping_charge real DEFAULT 0,
      cod_amount real DEFAULT 0,
      recipient_name text NOT NULL,
      recipient_phone text NOT NULL,
      recipient_address text NOT NULL,
      destination_city text NOT NULL,
      origin_city text NOT NULL,
      package_description text,
      ncm_response text,
      created_at integer,
      updated_at integer,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE INDEX IF NOT EXISTS shipments_order_idx ON shipments(order_id)`,
    `CREATE INDEX IF NOT EXISTS shipments_tracking_idx ON shipments(tracking_id)`,
    `CREATE INDEX IF NOT EXISTS shipments_status_idx ON shipments(system_status)`,
    `CREATE TABLE IF NOT EXISTS shipment_events (
      id text PRIMARY KEY NOT NULL,
      shipment_id text NOT NULL,
      partner_status text NOT NULL,
      vendor_return text,
      system_status text NOT NULL,
      occurred_at text,
      location text,
      raw text,
      created_at integer,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON UPDATE no action ON DELETE cascade
    )`,
    `CREATE INDEX IF NOT EXISTS shipment_events_shipment_idx ON shipment_events(shipment_id)`,
    `CREATE INDEX IF NOT EXISTS shipment_events_created_at_idx ON shipment_events(created_at)`,
  ];

  const alterStatements = [
    `ALTER TABLE product_variants ADD COLUMN barcode text`,
    `ALTER TABLE product_variants ADD COLUMN margin_percent real DEFAULT 30`,
    `ALTER TABLE product_variants ADD COLUMN tax_id text REFERENCES taxes(id)`,
    `ALTER TABLE product_variants ADD COLUMN stock_max integer`,
    `ALTER TABLE product_variants ADD COLUMN supplier_id text REFERENCES suppliers(id)`,
    `ALTER TABLE customers ADD COLUMN secondary_phone text`,
    `ALTER TABLE customers ADD COLUMN customer_no integer`,
    `ALTER TABLE customers ADD COLUMN delivery_charge real DEFAULT 0`,
    `ALTER TABLE customers ADD COLUMN baby_name text`,
    `ALTER TABLE customers ADD COLUMN baby_date integer`,
    `ALTER TABLE customers ADD COLUMN baby_gender text`,
    `ALTER TABLE customers ADD COLUMN notes text`,
    `ALTER TABLE customers ADD COLUMN email text`,
    `ALTER TABLE invoices ADD COLUMN payment_method text`,
    `ALTER TABLE invoices ADD COLUMN delivery_charge real DEFAULT 0`,
  ];

  const indexStatements = [
    // ... existing statements ...
    `CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS customers_customer_no_unique ON customers(customer_no)`,
    `CREATE INDEX IF NOT EXISTS customers_no_idx ON customers(customer_no)`,
    `CREATE INDEX IF NOT EXISTS invoices_customer_idx ON invoices(customer_id)`,
    `CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status)`,
    `CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments(invoice_id)`,
    `CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id)`,
    `CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status)`,
  ];

  for (const sql of createStatements) {
    await db.prepare(sql).run();
  }

  for (const sql of alterStatements) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const errorMessage = String(error);
      if (!errorMessage.includes('duplicate column name')) throw error;
    }
  }

  for (const sql of indexStatements) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const errorMessage = String(error);
      if (!errorMessage.includes('already exists')) throw error;
    }
  }
}

let migrateOnce: Promise<void> | null = null;

export function ensureMigrations(db: D1LikeDatabase) {
  if (!migrateOnce) migrateOnce = applyMigrations(db);
  return migrateOnce;
}


