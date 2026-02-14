// GET /api/orders/:id/shipment - Get shipment for an order

import { shipments, shipmentEvents } from '../../../database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const orderId = getRouterParam(event, 'id');

  if (!orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order ID is required',
    });
  }

  try {
    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.orderId, orderId),
      with: {
        events: {
          orderBy: (events, { desc }) => [desc(events.createdAt)],
        },
      },
    });

    if (!shipment) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: shipment,
    };
  } catch (error: any) {
    if (error.statusCode) throw error;

    console.error('Error fetching shipment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch shipment',
    });
  }
});
