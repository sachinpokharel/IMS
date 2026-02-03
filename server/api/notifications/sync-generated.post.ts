import { eq, and, isNotNull, sql } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const body = await readBody<{ generatedIds: string[] }>(event);
  const { generatedIds = [] } = body;

  const db = useDB();
  // Get all products with low stock or out of stock
  const allProducts = await db.query.products.findMany();

  const newNotifications = [];
  const currentGeneratedIds = new Set(generatedIds);

  for (const product of allProducts) {
    // Check main product stock
    if (product.stockQuantity !== null && product.stockMin !== null) {
      if (product.stockQuantity <= 0) {
        const generatedId = `out-of-stock-${product.id}`;
        if (!currentGeneratedIds.has(generatedId)) {
          // Check if this notification already exists for this user
          const existing = await db
            .select()
            .from(tables.notifications)
            .where(
              and(
                eq(tables.notifications.userId, user.id),
                eq(tables.notifications.generatedId, generatedId)
              )
            );

          if (existing.length === 0) {
            newNotifications.push({
              id: generateId(),
              userId: user.id,
              type: 'error' as const,
              title: 'Out of Stock',
              description: `${product.name} is out of stock`,
              href: `/products/${product.id}`,
              read: false,
              generatedId,
            });
          }
        }
      } else if (product.stockQuantity <= product.stockMin) {
        const generatedId = `low-stock-${product.id}`;
        if (!currentGeneratedIds.has(generatedId)) {
          const existing = await db
            .select()
            .from(tables.notifications)
            .where(
              and(
                eq(tables.notifications.userId, user.id),
                eq(tables.notifications.generatedId, generatedId)
              )
            );

          if (existing.length === 0) {
            newNotifications.push({
              id: generateId(),
              userId: user.id,
              type: 'warning' as const,
              title: 'Low Stock Alert',
              description: `${product.name} has only ${product.stockQuantity} units left (min: ${product.stockMin})`,
              href: `/products/${product.id}`,
              read: false,
              generatedId,
            });
          }
        }
      }
    }
  }

  // Check variants
  const variants = await db.query.productVariants.findMany();
  for (const variant of variants) {
    if (variant.stockQuantity !== null && variant.stockMin !== null) {
      // Find the product for this variant
      const product = allProducts.find((p: any) => p.id === variant.productId);
      if (!product) continue;

      if (variant.stockQuantity <= 0) {
        const generatedId = `out-of-stock-variant-${variant.id}`;
        if (!currentGeneratedIds.has(generatedId)) {
          const existing = await db
            .select()
            .from(tables.notifications)
            .where(
              and(
                eq(tables.notifications.userId, user.id),
                eq(tables.notifications.generatedId, generatedId)
              )
            );

          if (existing.length === 0) {
            newNotifications.push({
              id: generateId(),
              userId: user.id,
              type: 'error' as const,
              title: 'Out of Stock',
              description: `${product.name} - ${variant.name} is out of stock`,
              href: `/products/${product.id}`,
              read: false,
              generatedId,
            });
          }
        }
      } else if (variant.stockQuantity <= variant.stockMin) {
        const generatedId = `low-stock-variant-${variant.id}`;
        if (!currentGeneratedIds.has(generatedId)) {
          const existing = await db
            .select()
            .from(tables.notifications)
            .where(
              and(
                eq(tables.notifications.userId, user.id),
                eq(tables.notifications.generatedId, generatedId)
              )
            );

          if (existing.length === 0) {
            newNotifications.push({
              id: generateId(),
              userId: user.id,
              type: 'warning' as const,
              title: 'Low Stock Alert',
              description: `${product.name} - ${variant.name} has only ${variant.stockQuantity} units left`,
              href: `/products/${product.id}`,
              read: false,
              generatedId,
            });
          }
        }
      }
    }
  }

  // Insert new notifications
  if (newNotifications.length > 0) {
    await db.insert(tables.notifications).values(newNotifications);
  }

  return { created: newNotifications.length };
});
