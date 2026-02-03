// Simple caching utility using Nitro's storage layer

/**
 * Cache a function result with TTL (time to live)
 * Uses Nitro's built-in storage (Cloudflare KV on production)
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const storage = useStorage('cache');
  const existing = await storage.getItem<{
    value: T;
    expiresAt: number;
  }>(key);

  const now = Date.now();

  // Return cached value if still valid
  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  // Execute function and cache result
  const value = await fn();
  await storage.setItem(key, {
    value,
    expiresAt: now + ttlSeconds * 1000,
  });

  return value;
}
