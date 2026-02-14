import { sql, eq, desc, gte } from 'drizzle-orm';
import { stockMovements, products, categories } from '~~/server/database/schema';

export default defineEventHandler(async () => {
  const db = useDB();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const movementsByDay = await db
    .select({
      date: sql<string>`date(${stockMovements.createdAt} / 1000, 'unixepoch')`,
      type: stockMovements.type,
      totalQuantity: sql<number>`SUM(ABS(${stockMovements.quantity}))`,
    })
    .from(stockMovements)
    .where(gte(stockMovements.createdAt, thirtyDaysAgo))
    .groupBy(
      sql`date(${stockMovements.createdAt} / 1000, 'unixepoch')`,
      stockMovements.type
    )
    .orderBy(sql`date(${stockMovements.createdAt} / 1000, 'unixepoch')`);

  const movementsChartData = processMovementsByDay(movementsByDay);

  const productsByCategory = await db
    .select({
      categoryId: products.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      count: sql<number>`count(*)`,
    })
    .from(products)
    .leftJoin(
      categories,
      eq(products.categoryId, categories.id)
    )
    .where(eq(products.isActive, true))
    .groupBy(
      products.categoryId,
      categories.name,
      categories.color
    );

  const topProductsByValue = await db
    .select({
      id: products.id,
      name: products.name,
      stockValue: sql<number>`${products.costPrice} * ${products.stockQuantity}`,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(
      desc(sql`${products.costPrice} * ${products.stockQuantity}`)
    )
    .limit(10);

  const stockLevelsResult = await db
    .select({
      stockStatus: sql<string>`
        CASE 
          WHEN ${products.stockQuantity} = 0 THEN 'out_of_stock'
          WHEN ${products.stockQuantity} <= ${products.stockMin} THEN 'low_stock'
          WHEN ${products.stockMax} IS NOT NULL AND ${products.stockQuantity} >= ${products.stockMax} THEN 'overstock'
          ELSE 'normal'
        END
      `,
      count: sql<number>`count(*)`,
    })
    .from(products)
    .where(eq(products.isActive, true)).groupBy(sql`
      CASE 
        WHEN ${products.stockQuantity} = 0 THEN 'out_of_stock'
        WHEN ${products.stockQuantity} <= ${products.stockMin} THEN 'low_stock'
        WHEN ${products.stockMax} IS NOT NULL AND ${products.stockQuantity} >= ${products.stockMax} THEN 'overstock'
        ELSE 'normal'
      END
    `);

  const movementsByType = await db
    .select({
      type: stockMovements.type,
      count: sql<number>`count(*)`,
      totalQuantity: sql<number>`SUM(ABS(${stockMovements.quantity}))`,
    })
    .from(stockMovements)
    .where(gte(stockMovements.createdAt, thirtyDaysAgo))
    .groupBy(stockMovements.type);

  return {
    movementsChart: movementsChartData,
    productsByCategory,
    topProductsByValue,
    stockLevels: stockLevelsResult,
    movementsByType,
  };
});

function processMovementsByDay(
  movements: { date: string; type: string; totalQuantity: number }[]
) {
  const dateMap = new Map<string, { in: number; out: number }>();

  const dates: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0]!;
    dates.push(dateStr);
    dateMap.set(dateStr, { in: 0, out: 0 });
  }

  for (const m of movements) {
    if (dateMap.has(m.date)) {
      const existing = dateMap.get(m.date)!;
      if (m.type === 'in') {
        existing.in = m.totalQuantity;
      } else if (m.type === 'out') {
        existing.out = m.totalQuantity;
      }
    }
  }

  const labels = dates.map((d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const stockIn = dates.map((d) => dateMap.get(d)?.in || 0);
  const stockOut = dates.map((d) => dateMap.get(d)?.out || 0);

  return { labels, stockIn, stockOut };
}
