import { eq } from 'drizzle-orm';
import { invoices } from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invoice ID is required',
    });
  }

  try {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        customer: true,
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Invoice not found',
      });
    }

    return invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch invoice',
    });
  }
});
