import { shipments } from '~~/server/database/schema';
import { desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const db = useDB();

    try {
        const result = await db.query.shipments.findMany({
            with: {
                order: {
                    with: {
                        customer: true
                    }
                },
                events: true,
            },
            orderBy: desc(shipments.createdAt),
            limit: 50,
        });

        return result;
    } catch (error) {
        console.error('Error fetching shipments:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch shipments',
        });
    }
});
