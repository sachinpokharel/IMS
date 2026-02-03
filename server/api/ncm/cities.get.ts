// GET /api/ncm/cities - Get list of NCM branch/city locations

import { createNcmClient } from '../../utils/ncm.client';
import { cached } from '../../utils/cache';

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();

  if (!config.ncmApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NCM API key not configured',
    });
  }

  const ncm = createNcmClient({
    apiUrl: config.ncmApiUrl,
    apiKey: config.ncmApiKey,
  });

  // Cache for 7 days (cities don't change often)
  const data = await cached('ncm:branchlist', 7 * 24 * 60 * 60, () =>
    ncm.branchList()
  );

  return {
    success: true,
    data,
  };
});
