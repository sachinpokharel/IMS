CREATE TABLE IF NOT EXISTS notifications (
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
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_generated_idx ON notifications(generated_id);
