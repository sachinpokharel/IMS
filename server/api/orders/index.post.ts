import { orders, orderItems, customers } from '~~/server/database/schema';
import { generateId } from '~~/server/utils/id';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody<{
    customerId: string;
    items: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
    }>;
    discountAmount?: number;
    deliveryCharge?: number;
    expectedDeliveryDate?: number;
    notes?: string;
    paymentMethod?: string;
    status?: string;
  }>(event);

  // Validate required fields
  if (!body.customerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Customer ID is required',
    });
  }

  if (!body.items || body.items.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one order item is required',
    });
  }

  try {
    const orderId = generateId('ORD');
    const orderNumber = `ORD-${Date.now()}`;

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    const processedItems = body.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const taxRate = item.taxRate || 0;
      const itemTax = lineTotal * (taxRate / 100);
      
      subtotal += lineTotal;
      taxAmount += itemTax;

      return {
        id: generateId('ORI'),
        orderId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: taxRate,
        taxAmount: itemTax,
        discountAmount: 0,
        lineTotal: lineTotal + itemTax,
      };
    });

    const discountAmount = body.discountAmount || 0;
    const deliveryCharge = body.deliveryCharge || 0;
    const totalAmount = subtotal + taxAmount - discountAmount + deliveryCharge;

    // Create order
    const [newOrder] = await db
      .insert(orders)
      .values({
        id: orderId,
        orderNumber,
        customerId: body.customerId,
        subtotal,
        taxAmount,
        discountAmount,
        deliveryCharge,
        totalAmount,
        status: body.status || 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: body.paymentMethod || 'cash_on_delivery',
        orderDate: new Date(),
        expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : undefined,
        notes: body.notes,
      })
      .returning();

    // Create order items
    await db.insert(orderItems).values(processedItems);

    // Update customer's delivery charge if provided and greater than 0
    if (deliveryCharge > 0) {
      await db
        .update(customers)
        .set({ deliveryCharge })
        .where(eq(customers.id, body.customerId));
    }

    return newOrder;
  } catch (error) {
    console.error('Error creating order:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create order',
    });
  }
});
