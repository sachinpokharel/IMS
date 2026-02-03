-- Add NCM delivery partner integration tables

CREATE TABLE IF NOT EXISTS shipments (
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
);

CREATE INDEX IF NOT EXISTS shipments_order_idx ON shipments(order_id);
CREATE INDEX IF NOT EXISTS shipments_tracking_idx ON shipments(tracking_id);
CREATE INDEX IF NOT EXISTS shipments_status_idx ON shipments(system_status);

CREATE TABLE IF NOT EXISTS shipment_events (
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
);

CREATE INDEX IF NOT EXISTS shipment_events_shipment_idx ON shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS shipment_events_created_at_idx ON shipment_events(created_at);
