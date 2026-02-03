# Activity Logging System

## Overview
The activity logging system tracks all user actions across the application, including:
- Product/Invoice/Order/Customer creation, updates, and deletions
- User authentication (login/logout)
- Any custom actions you want to track

## Database Schema
Located in `server/database/schema.ts`:
- **id**: Unique identifier
- **userId**: User who performed the action
- **action**: Type of action (created, updated, deleted, login, logout, etc.)
- **entityType**: Type of entity (product, invoice, order, customer, etc.)
- **entityId**: ID of the affected entity
- **entityName**: Name/description of the entity
- **details**: JSON string with additional information
- **ipAddress**: IP address of the user
- **userAgent**: Browser/client information
- **createdAt**: Timestamp

## Usage

### 1. Import the helper function
```typescript
import { logActivity } from '~/server/utils/activity';
```

### 2. Call logActivity in your API endpoint
```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = useDB();
  
  // ... your logic here ...
  
  // Log the activity
  await logActivity(event, {
    action: 'created',
    entityType: 'product',
    entityId: productId,
    entityName: body.name,
    details: {
      sku: body.sku,
      price: body.sellingPrice,
      category: body.categoryId,
    },
  });
  
  return { success: true };
});
```

### 3. Common Action Types
- **created**: Entity was created
- **updated**: Entity was updated
- **deleted**: Entity was deleted
- **login**: User logged in
- **logout**: User logged out
- **exported**: Data was exported
- **imported**: Data was imported
- **status_changed**: Status was modified (e.g., order status)

### 4. Common Entity Types
- **product**: Products
- **invoice**: Invoices
- **order**: Orders
- **customer**: Customers
- **user**: Users
- **category**: Categories
- **supplier**: Suppliers
- **auth**: Authentication events

## Viewing Activity Logs
Activity logs can be viewed by admin users at `/activity-logs` page with:
- Filtering by action type
- Filtering by entity type
- Search functionality
- Pagination
- Activity statistics

## Examples

### Product Creation
```typescript
await logActivity(event, {
  action: 'created',
  entityType: 'product',
  entityId: id,
  entityName: body.name,
  details: {
    sku: body.sku,
    category: body.categoryId,
    variants: body.variants?.length || 0,
  },
});
```

### Order Status Change
```typescript
await logActivity(event, {
  action: 'status_changed',
  entityType: 'order',
  entityId: orderId,
  entityName: order.orderNumber,
  details: {
    oldStatus: order.status,
    newStatus: body.status,
  },
});
```

### Invoice Deletion
```typescript
await logActivity(event, {
  action: 'deleted',
  entityType: 'invoice',
  entityId: id,
  entityName: invoice.invoiceNumber,
});
```

### User Login (already implemented)
```typescript
await db.insert(tables.activityLogs).values({
  id: generateId(),
  userId: user.id,
  action: 'login',
  entityType: 'auth',
  entityName: user.email,
  ipAddress: headers['x-forwarded-for'] || event.node.req.socket?.remoteAddress,
  userAgent: headers['user-agent'],
});
```

## API Endpoints

### GET /api/activity-logs
Fetch activity logs with filtering and pagination
- Query params: `page`, `limit`, `entityType`, `action`, `search`

### GET /api/activity-logs/stats
Get activity statistics for the last 30 days

## Migration
Run the migration endpoint to create the `activity_logs` table:
- Visit `/api/__migrate` to apply database migrations
