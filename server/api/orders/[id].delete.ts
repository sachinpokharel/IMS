import { orders } from '~~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

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

    // Delete order (cascade will delete order items)
    await db.delete(orders).where(eq(orders.id, id));

    return { success: true, message: 'Order deleted successfully' };
  } catch (error: any) {
    if (error.statusCode) throw error;
    
    console.error('Error deleting order:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete order',
    });
  }
});
