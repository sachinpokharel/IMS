import { eq } from 'drizzle-orm';
import { customers } from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Customer ID is required',
    });
  }

  try {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!customer) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Customer not found',
      });
    }

    return customer;
  } catch (error) {
    console.error('Error fetching customer:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch customer',
    });
  }
});
