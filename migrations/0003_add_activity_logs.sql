CREATE TABLE IF NOT EXISTS activity_logs (
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
);

CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_entity_idx ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);
