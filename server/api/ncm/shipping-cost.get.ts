// GET /api/ncm/shipping-cost?destination=KATHMANDU - Get shipping rate

import { createNcmClient } from '../../utils/ncm.client';
import { cached } from '../../utils/cache';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const destination = query.destination;

  if (!destination || typeof destination !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'destination parameter is required',
    });
  }

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

  // Cache shipping rates for 24 hours per destination
  const cacheKey = `ncm:rate:${destination.toUpperCase()}`;
  const data = await cached(cacheKey, 24 * 60 * 60, () =>
    ncm.shippingRate({
      creation: config.ncmOriginBranch,
      destination: destination.toUpperCase(),
      type: 'Pickup/Collect',
    })
  );

  return {
    success: true,
    data,
  };
});
