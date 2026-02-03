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
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        customer: true,
        items: {
          with: {
            product: true,
            variant: true,
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

    return order;
  } catch (error: any) {
    if (error.statusCode) throw error;
    
    console.error('Error fetching order:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch order',
    });
  }
});
