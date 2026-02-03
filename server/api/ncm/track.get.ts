// GET /api/ncm/track?trackingId=NCM123 - Get shipment tracking status

import { createNcmClient } from '../../utils/ncm.client';
import { shipments, shipmentEvents } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { mapNcmStatus, mapNcmToOrderStatus } from '../../utils/ncm.mapping';
import { generateId } from '../../utils/id';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const trackingId = query.trackingId;

  if (!trackingId || typeof trackingId !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'trackingId parameter is required',
    });
  }

  const config = useRuntimeConfig();
  const db = useDB();

  // Find shipment in our database
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.trackingId, trackingId),
    with: {
      order: true,
      events: {
        orderBy: (events, { desc }) => [desc(events.createdAt)],
      },
    },
  });

  if (!shipment) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Shipment not found',
    });
  }

  // Fetch latest status from NCM
  const ncm = createNcmClient({
    apiUrl: config.ncmApiUrl,
    apiKey: config.ncmApiKey,
  });

  let ncmStatus;
  try {
    ncmStatus = await ncm.orderStatus(trackingId);
  } catch (error) {
    console.error('Error fetching NCM status:', error);
    // Return cached data if NCM API fails
    return {
      success: true,
      data: {
        shipment,
        cached: true,
      },
    };
  }

  // Check if status has changed
  const latestPartnerStatus = (ncmStatus as any).status || '';
  const latestVendorReturn = (ncmStatus as any).vendor_return || '';

  if (latestPartnerStatus !== shipment.systemStatus) {
    const newSystemStatus = mapNcmStatus(
      latestPartnerStatus,
      latestVendorReturn
    );
    const newOrderStatus = mapNcmToOrderStatus(
      latestPartnerStatus,
      latestVendorReturn
    );

    // Update shipment status
    await db
      .update(shipments)
      .set({
        systemStatus: newSystemStatus,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipment.id));

    // Create shipment event
    await db.insert(shipmentEvents).values({
      id: generateId('EVENT'),
      shipmentId: shipment.id,
      partnerStatus: latestPartnerStatus,
      vendorReturn: latestVendorReturn,
      systemStatus: newSystemStatus,
      occurredAt: (ncmStatus as any).updated_at || new Date().toISOString(),
      location: (ncmStatus as any).location || null,
      raw: JSON.stringify(ncmStatus),
      createdAt: new Date(),
    });

    // Update order status if needed (will be done by webhook, but also here for sync)
    const { orders } = await import('../../database/schema');
    await db
      .update(orders)
      .set({
        status: newOrderStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, shipment.orderId));
  }

  // Re-fetch updated shipment
  const updatedShipment = await db.query.shipments.findFirst({
    where: eq(shipments.trackingId, trackingId),
    with: {
      order: true,
      events: {
        orderBy: (events, { desc }) => [desc(events.createdAt)],
      },
    },
  });

  return {
    success: true,
    data: {
      shipment: updatedShipment,
      ncmStatus,
    },
  };
});
