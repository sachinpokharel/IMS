import { invoices, invoiceItems, customers, productVariants, products } from '~~/server/database/schema';
import { generateId } from '~~/server/utils/id';
import { eq, and } from 'drizzle-orm';

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
    dueDate?: number;
    notes?: string;
    paymentMethod?: string;
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
      statusMessage: 'At least one invoice item is required',
    });
  }

  try {
    const invoiceId = generateId('INV');
    const invoiceNumber = `INV-${Date.now()}`;

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
        id: generateId('ITM'),
        invoiceId,
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

    // Create invoice
    const [newInvoice] = await db
      .insert(invoices)
      .values({
        id: invoiceId,
        invoiceNumber,
        customerId: body.customerId,
        subtotal,
        taxAmount,
        discountAmount,
        deliveryCharge,
        totalAmount,
        status: 'draft',
        paymentMethod: body.paymentMethod || 'bank',
        issuedDate: new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        notes: body.notes,
      })
      .returning();

    // Create invoice items
    await db.insert(invoiceItems).values(processedItems);

    // Deduct stock from product variants
    for (const item of body.items) {
      if (item.variantId) {
        // If variant is specified, deduct from variant
        // Fetch current stock quantity
        const variant = await db.query.productVariants.findFirst({
          where: eq(productVariants.id, item.variantId),
        });
        if (variant) {
          await db
            .update(productVariants)
            .set({
              stockQuantity: (variant.stockQuantity ?? 0) - item.quantity,
            })
            .where(eq(productVariants.id, item.variantId));
        }
      } else {
        // If no variant, deduct from product's default variant or all variants
        const variant = await db.query.productVariants.findFirst({
          where: eq(productVariants.productId, item.productId),
        });
        if (variant) {
          // Fetch current stock quantity for the variant
          const currentVariant = await db.query.productVariants.findFirst({
            where: eq(productVariants.id, variant.id),
          });
          if (currentVariant) {
            await db
              .update(productVariants)
              .set({
                stockQuantity: (currentVariant.stockQuantity ?? 0) - item.quantity,
              })
              .where(eq(productVariants.id, variant.id));
          }
        }
      }
    }

    // Update customer's delivery charge if provided and greater than 0
    if (deliveryCharge > 0) {
      await db
        .update(customers)
        .set({ deliveryCharge })
        .where(eq(customers.id, body.customerId));
    }

    return newInvoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create invoice',
    });
  }
});
