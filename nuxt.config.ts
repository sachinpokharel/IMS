// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxthub/core',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxtjs/tailwindcss',
    'nuxt-auth-utils',
    '@pinia/nuxt',
  ],

  hub: {
    database: true,
    kv: true,
  },

  // Runtime config for admin operations
  runtimeConfig: {
    // Server-only (not exposed to client)
    adminSecretKey: '', // Set via NUXT_ADMIN_SECRET_KEY env var
    migrateSecretKey: '', // Set via NUXT_MIGRATE_SECRET_KEY env var (prod only)
    // NCM (Nepal Can Move) delivery partner integration
    ncmApiKey: '', // Set via NUXT_NCM_API_KEY env var
    ncmApiUrl: process.env.NUXT_NCM_API_URL || 'https://portal.nepalcanmove.com/api/v1',
    ncmOriginBranch: process.env.NUXT_NCM_ORIGIN_BRANCH || 'BIRGUNJ',
  },

  // Pinia configuration
  pinia: {
    storesDirs: ['./app/stores/**'],
  },

  // Prevent Vue Router from matching API routes
  router: {
    options: {
      strict: true,
    },
  },

  // Configure nitro to handle API routes properly
  nitro: {
    routeRules: {
      '/api/**': { cors: false },
      '/_next/**': { cache: { maxAge: 0 } },
      '/webpack-hmr': { cache: { maxAge: 0 } },
    },
  },
});
