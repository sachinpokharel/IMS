import { orders, orderItems } from '~~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');
  const body = await readBody<{
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    expectedDeliveryDate?: number;
    notes?: string;
    discountAmount?: number;
    deliveryCharge?: number;
  }>(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order ID is required',
    });
  }

  try {
    // Check if order exists
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!existingOrder) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found',
      });
    }

    // Recalculate totals if discount or delivery charge changed
    let updateData: any = {
      updatedAt: new Date(),
    };

    if (body.status !== undefined) updateData.status = body.status;
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus;
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod;
    if (body.expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = body.expectedDeliveryDate 
        ? new Date(body.expectedDeliveryDate) 
        : null;
    }
    if (body.notes !== undefined) updateData.notes = body.notes;

    if (body.discountAmount !== undefined || body.deliveryCharge !== undefined) {
      const discountAmount = body.discountAmount ?? existingOrder.discountAmount ?? 0;
      const deliveryCharge = body.deliveryCharge ?? existingOrder.deliveryCharge ?? 0;
      const totalAmount = (existingOrder.subtotal ?? 0) + (existingOrder.taxAmount ?? 0) - discountAmount + deliveryCharge;
      
      updateData.discountAmount = discountAmount;
      updateData.deliveryCharge = deliveryCharge;
      updateData.totalAmount = totalAmount;
    }

    // Update order
    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();

    return updatedOrder;
  } catch (error: any) {
    if (error.statusCode) throw error;
    
    console.error('Error updating order:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update order',
    });
  }
});
