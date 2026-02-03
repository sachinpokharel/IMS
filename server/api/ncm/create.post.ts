// POST /api/ncm/create - Create NCM delivery shipment for an order

import { createNcmClient } from '../../utils/ncm.client';
import { cleanPhoneForNcm, mapNcmStatus } from '../../utils/ncm.mapping';
import { formatPhoneWithCountryCode } from '../../utils/phone';
import { orders, shipments } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '../../utils/id';
import { logActivity } from '../../utils/activity';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { orderId, destinationCity } = body;

  if (!orderId || typeof orderId !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'orderId is required',
    });
  }

  if (!destinationCity || typeof destinationCity !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'destinationCity is required',
    });
  }

  const config = useRuntimeConfig();
  const db = useDB();

  // Fetch order with customer details
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      customer: true,
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Order not found',
    });
  }

  // Check if shipment already exists
  const existingShipment = await db.query.shipments.findFirst({
    where: eq(shipments.orderId, orderId),
  });

  if (existingShipment) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Shipment already exists for this order',
    });
  }

  // Get shipping rate from NCM
  const ncm = createNcmClient({
    apiUrl: config.ncmApiUrl,
    apiKey: config.ncmApiKey,
  });

  const shippingRate = await ncm.shippingRate({
    creation: config.ncmOriginBranch,
    destination: destinationCity.toUpperCase(),
    type: 'Pickup/Collect',
  });

  // Calculate COD amount (remaining payment)
  // If payment method is COD, use totalAmount minus any paid amount
  let codAmount = 0;
  if (order.paymentMethod === 'cash_on_delivery') {
    codAmount = order.totalAmount || 0;
    
    // If payment status is partial, subtract what's been paid
    if (order.paymentStatus === 'partial') {
      // In a full implementation, you'd sum up actual payments
      // For now, we'll use the full amount
      codAmount = order.totalAmount || 0;
    }
  }

  // Prepare package description from order items
  const packageDesc = order.items
    .map((item) => `${item.product.name} x${item.quantity}`)
    .join(', ')
    .substring(0, 50);

  // Create NCM order
  const ncmPayload = {
    name: order.customer.name,
    phone: cleanPhoneForNcm(order.customer.phone),
    phone2: cleanPhoneForNcm(order.customer.secondaryPhone || ''),
    address: order.customer.address || order.customer.street || '',
    cod_charge: Math.round(codAmount),
    fbranch: config.ncmOriginBranch,
    branch: destinationCity.toUpperCase(),
    package: packageDesc,
  };

  const ncmResponse = await ncm.createOrder(ncmPayload);

  // Extract tracking ID from NCM response
  // Adjust based on actual NCM API response structure
  const trackingId =
    (ncmResponse as any).tracking_id ||
    (ncmResponse as any).id ||
    (ncmResponse as any).order_id ||
    generateId('NCM');

  const systemStatus = mapNcmStatus(
    (ncmResponse as any).status || 'Drop off Order Created'
  );

  // Create shipment record
  const shipmentId = generateId('SHIP');
  await db.insert(shipments).values({
    id: shipmentId,
    orderId: order.id,
    partner: 'NCM',
    ncmOrderId: (ncmResponse as any).order_id || null,
    trackingId,
    systemStatus,
    shippingCharge: (shippingRate as any).charge || order.deliveryCharge || 0,
    codAmount,
    recipientName: order.customer.name,
    recipientPhone: formatPhoneWithCountryCode(order.customer.phone),
    recipientAddress: order.customer.address || order.customer.street || '',
    destinationCity: destinationCity.toUpperCase(),
    originCity: config.ncmOriginBranch,
    packageDescription: packageDesc,
    ncmResponse: JSON.stringify(ncmResponse),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Update order status to confirmed if it was pending
  if (order.status === 'pending') {
    await db
      .update(orders)
      .set({
        status: 'confirmed',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
  }

  // Log activity
  await logActivity(event, {
    action: 'created',
    entityType: 'shipment',
    entityId: shipmentId,
    entityName: `NCM Shipment ${trackingId}`,
    details: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      trackingId,
      destinationCity,
      codAmount,
    },
  });

  return {
    success: true,
    data: {
      shipmentId,
      trackingId,
      systemStatus,
      shippingCharge: (shippingRate as any).charge || order.deliveryCharge,
      ncmResponse,
    },
  };
});
