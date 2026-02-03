// POST /api/ncm/webhook - NCM delivery status webhook
// This endpoint receives automatic status updates from NCM

import { shipments, shipmentEvents, orders } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { mapNcmStatus, mapNcmToOrderStatus } from '../../utils/ncm.mapping';
import { generateId } from '../../utils/id';
import { logActivity } from '../../utils/activity';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Extract tracking ID from webhook payload
  // Adjust based on actual NCM webhook structure
  const trackingId = body.tracking_id || body.id || body.order_id;
  const partnerStatus = body.status || '';
  const vendorReturn = body.vendor_return || '';
  const occurredAt = body.updated_at || body.timestamp || new Date().toISOString();
  const location = body.location || body.branch || '';

  if (!trackingId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'tracking_id is required',
    });
  }

  const db = useDB();

  // Find shipment
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.trackingId, trackingId),
    with: {
      order: true,
    },
  });

  if (!shipment) {
    // Log but don't fail - might be a webhook for a shipment not in our system
    console.warn(`Webhook received for unknown tracking ID: ${trackingId}`);
    return {
      success: true,
      message: 'Tracking ID not found, ignored',
    };
  }

  // Map statuses
  const systemStatus = mapNcmStatus(partnerStatus, vendorReturn);
  const orderStatus = mapNcmToOrderStatus(partnerStatus, vendorReturn);

  // Create shipment event
  const eventId = generateId('EVENT');
  await db.insert(shipmentEvents).values({
    id: eventId,
    shipmentId: shipment.id,
    partnerStatus,
    vendorReturn,
    systemStatus,
    occurredAt,
    location,
    raw: JSON.stringify(body),
    createdAt: new Date(),
  });

  // Update shipment status
  await db
    .update(shipments)
    .set({
      systemStatus,
      updatedAt: new Date(),
    })
    .where(eq(shipments.id, shipment.id));

  // Auto-update order status based on delivery status
  const previousOrderStatus = shipment.order.status;
  
  if (previousOrderStatus !== orderStatus) {
    await db
      .update(orders)
      .set({
        status: orderStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, shipment.orderId));

    // Log activity for order status change
    await logActivity(event, {
      action: 'updated',
      entityType: 'order',
      entityId: shipment.orderId,
      entityName: shipment.order.orderNumber,
      details: {
        field: 'status',
        oldValue: previousOrderStatus,
        newValue: orderStatus,
        reason: 'NCM delivery status update',
        ncmStatus: partnerStatus,
        trackingId,
      },
    });
  }

  // Log shipment event activity
  await logActivity(event, {
    action: 'updated',
    entityType: 'shipment',
    entityId: shipment.id,
    entityName: `NCM Shipment ${trackingId}`,
    details: {
      orderId: shipment.orderId,
      orderNumber: shipment.order.orderNumber,
      partnerStatus,
      systemStatus,
      location,
      orderStatusChanged: previousOrderStatus !== orderStatus,
    },
  });

  return {
    success: true,
    message: 'Webhook processed successfully',
    data: {
      trackingId,
      systemStatus,
      orderStatus,
      orderStatusChanged: previousOrderStatus !== orderStatus,
    },
  };
});
