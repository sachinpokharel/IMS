export default defineEventHandler(async (event) => {
  // Protect migration endpoint with a secret key
  // Only allow in development OR with valid MIGRATE_SECRET header
  const isDev = import.meta.dev;
  const migrateSecret = useRuntimeConfig().migrateSecretKey as string | undefined;
  const providedSecret = getHeader(event, 'x-migrate-secret');

  if (!isDev) {
    if (!migrateSecret) {
      throw createError({
        statusCode: 503,
        message:
          'Migration endpoint not configured. Set NUXT_MIGRATE_SECRET environment variable.',
      });
    }
    if (providedSecret !== migrateSecret) {
      throw createError({
        statusCode: 401,
        message: 'Invalid or missing migration secret',
      });
    }
  }

  const { applyMigrations } = await import('../utils/migrate');
  const db = hubDatabase();
  const results: string[] = [];

  try {
    await applyMigrations(db);
    results.push('Migrations applied successfully');
    return { success: true, message: 'Migrations applied successfully', results };
  } catch (error) {
    return { success: false, error: String(error), results };
  }
});
