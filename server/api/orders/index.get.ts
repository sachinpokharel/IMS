import { orders } from '~~/server/database/schema';
import { desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const query = getQuery(event);
  const status = (query.status as string) || '';
  const customerId = (query.customerId as string) || '';

  try {
    const result = await db.query.orders.findMany({
      with: {
        customer: true,
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: desc(orders.orderDate),
    });
    
    // Filter by customerId if provided
    let filtered = result;
    if (customerId) {
      filtered = result.filter((order) => order.customerId === customerId);
    }
    
    // Filter by status if provided
    if (status && status !== 'all') {
      filtered = filtered.filter((order) => order.status === status);
    }

    return filtered;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch orders',
    });
  }
});
