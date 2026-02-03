import { eq, sql, lte, desc } from 'drizzle-orm';
import { products, suppliers, stockMovements, customers, invoices, productVariants } from '~~/server/database/schema';

export default defineEventHandler(async () => {
  const db = useDB();

  try {
    const totalProductsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isActive, true));
    const totalProducts = totalProductsResult[0]?.count ?? 0;

    const totalSuppliersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(suppliers)
      .where(eq(suppliers.isActive, true));
    const totalSuppliers = totalSuppliersResult[0]?.count ?? 0;

    const totalCustomersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers);
    const totalCustomers = totalCustomersResult[0]?.count ?? 0;

    // Calculate total sales from paid invoices
    let totalSales = 0;
    try {
      const totalSalesResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
        })
        .from(invoices)
        .where(eq(invoices.status, 'paid'));
      totalSales = Math.round((totalSalesResult[0]?.total ?? 0) * 100) / 100;
    } catch (error) {
      console.error('Error calculating total sales:', error);
      // If invoices table doesn't exist or error occurs, default to 0
      totalSales = 0;
    }

    const lowStockProducts = await db
      .select()
      .from(products)
      .where(
        sql`(${products.stockQuantity} = 0 OR (${products.stockMin} IS NOT NULL AND ${products.stockQuantity} <= ${products.stockMin})) AND (${products.isActive} = 1)`
      )
      .orderBy(products.stockQuantity)
      .limit(5);

    // Also get low stock variants
    const lowStockVariants = await db
      .select({
        id: productVariants.id,
        name: productVariants.name,
        sku: productVariants.sku,
        stockQuantity: productVariants.stockQuantity,
        stockMin: productVariants.stockMin,
        stockMax: productVariants.stockMax,
        costPrice: productVariants.costPrice,
        productId: productVariants.productId,
        isVariant: sql<boolean>`true`,
      })
      .from(productVariants)
      .where(
        sql`(${productVariants.stockQuantity} = 0 OR (${productVariants.stockMin} IS NOT NULL AND ${productVariants.stockQuantity} <= ${productVariants.stockMin}))`
      )
      .orderBy(productVariants.stockQuantity)
      .limit(5);

    // Combine and sort both products and variants
    const combinedLowStock = [
      ...lowStockProducts.map(p => ({ ...p, isVariant: false })),
      ...lowStockVariants
    ].sort((a, b) => (a.stockQuantity || 0) - (b.stockQuantity || 0)).slice(0, 5);

    // Get ALL low stock items (including out of stock) for accurate count
    const allLowStockItems = await db
      .select()
      .from(products)
      .where(
        sql`(${products.stockQuantity} = 0 OR (${products.stockMin} IS NOT NULL AND ${products.stockQuantity} <= ${products.stockMin})) AND (${products.isActive} = 1)`
      );

    // Get all low stock variants for count
    const allLowStockVariants = await db
      .select()
      .from(productVariants)
      .where(
        sql`(${productVariants.stockQuantity} = 0 OR (${productVariants.stockMin} IS NOT NULL AND ${productVariants.stockQuantity} <= ${productVariants.stockMin}))`
      );

    const totalLowStockCount = allLowStockItems.length + allLowStockVariants.length;

    const stockValueResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${products.costPrice} * ${products.stockQuantity}), 0)`,
      })
      .from(products)
      .where(eq(products.isActive, true));
    const totalStockValue =
      Math.round((stockValueResult[0]?.total ?? 0) * 100) / 100;

    const recentMovements = await db.query.stockMovements.findMany({
      limit: 5,
      orderBy: [desc(stockMovements.createdAt)],
      with: {
        product: true,
      },
    });

    return {
      totalProducts,
      totalSuppliers,
      totalCustomers,
      totalSales,
      lowStockCount: totalLowStockCount,
      totalStockValue,
      lowStockProducts: combinedLowStock,
      recentMovements,
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch dashboard stats',
    });
  }
});
