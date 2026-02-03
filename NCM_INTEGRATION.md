# Nepal Can Move (NCM) Delivery Integration

This document describes the Nepal Can Move delivery partner integration for OpenStock.

## Features

- **Automatic order status synchronization** - Order status automatically updates based on NCM delivery status
- **COD payment tracking** - Syncs remaining payment as COD amount with NCM
- **Real-time tracking** - Track shipments with NCM tracking IDs
- **Webhook support** - Receive automatic status updates from NCM
- **Cached API calls** - Cities and shipping rates cached for performance

## Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
NUXT_NCM_API_KEY=your-ncm-api-key-here
NUXT_NCM_API_URL=https://portal.nepalcanmove.com/api/v1
NUXT_NCM_ORIGIN_BRANCH=BIRGUNJ
```

- `NUXT_NCM_API_KEY` - Your NCM API authentication key
- `NUXT_NCM_API_URL` - NCM API base URL (default: https://portal.nepalcanmove.com/api/v1)
- `NUXT_NCM_ORIGIN_BRANCH` - Your warehouse/origin city (e.g., BIRGUNJ, KATHMANDU)

### 2. Run Database Migration

The migration will create `shipments` and `shipment_events` tables:

```bash
# Development (auto-runs on server start)
npm run dev

# Production
# Migration runs automatically via Nuxt Hub
```

### 3. Configure NCM Webhook (Production)

Configure NCM to send webhook notifications to:

```
POST https://your-domain.com/api/ncm/webhook
```

The webhook will automatically update order statuses based on delivery events.

## Order Status Mapping

NCM delivery status automatically updates order status:

| NCM Status | Order Status | Description |
|------------|--------------|-------------|
| Drop off Order Created | `confirmed` | Order confirmed, ready for pickup |
| Drop off Order Collected | `processing` | Package picked up from warehouse |
| Sent for Delivery | `processing` | Out for delivery to customer |
| Delivered | `completed` | Successfully delivered |
| Delivery Failed | `delivery_failed` | Delivery attempt failed |
| Returned to Sender | `cancelled` | Package returned (RTO) |

## COD Payment Sync

When `paymentMethod` is `cash_on_delivery`:

- COD amount = `totalAmount` (unpaid balance)
- NCM collects payment on delivery
- System tracks COD amount in `shipments.codAmount`

## Usage

### Creating a Shipment

1. Navigate to an order detail page
2. Click "Book NCM Delivery" button (available for `pending` or `confirmed` orders)
3. Select destination city
4. Review shipping cost and COD amount
5. Click "Book Delivery"

The system will:
- Create NCM order via API
- Store shipment record with tracking ID
- Update order status to `confirmed` (if pending)
- Log activity

### Tracking a Shipment

On the order detail page, the shipment tracking section shows:
- Tracking ID
- Current status
- Destination city
- COD amount (if applicable)
- Shipping charge
- Timeline of tracking events

Click "Refresh" to fetch latest status from NCM.

## API Endpoints

### Public Endpoints

**GET /api/ncm/cities**
- Get list of NCM branch/city locations
- Cached for 7 days

**GET /api/ncm/shipping-cost?destination=KATHMANDU**
- Get shipping rate for destination
- Cached for 24 hours per destination

### Protected Endpoints (Auth Required)

**POST /api/ncm/create**
```json
{
  "orderId": "ORD_xxx",
  "destinationCity": "KATHMANDU"
}
```
- Creates NCM shipment for an order
- Returns tracking ID and shipment details

**GET /api/ncm/track?trackingId=NCM123**
- Get shipment tracking status
- Updates local database with latest status

**POST /api/ncm/webhook**
- NCM webhook endpoint
- Automatically updates shipment and order status

**GET /api/orders/:id/shipment**
- Get shipment for a specific order

## Database Schema

### shipments
- `id` - Shipment ID (SHIP_xxx)
- `orderId` - Foreign key to orders
- `trackingId` - NCM tracking ID
- `systemStatus` - Mapped status (ORDER_CREATED, IN_TRANSIT, etc.)
- `codAmount` - Cash on delivery amount
- `shippingCharge` - Delivery charge
- `destinationCity` - Destination branch
- `recipientName`, `recipientPhone`, `recipientAddress`
- `ncmResponse` - Full NCM API response (JSON)

### shipment_events
- `id` - Event ID (EVENT_xxx)
- `shipmentId` - Foreign key to shipments
- `partnerStatus` - Raw NCM status
- `systemStatus` - Mapped status
- `occurredAt` - Timestamp from NCM
- `location` - Location from tracking
- `raw` - Full event data (JSON)

## Phone Number Formatting

The system automatically formats phone numbers for NCM API:

- Removes country codes (977, 91)
- Removes leading zeros
- Strips non-numeric characters
- Compatible with existing `phone.ts` utility

Example: `+977 984-1234567` → `9841234567`

## Error Handling

- Invalid API key → 500 error, check environment variables
- Order not found → 404 error
- Duplicate shipment → 409 error (shipment already exists)
- NCM API errors → Logged and returned to client

## Activity Logging

All NCM operations are logged:

- Shipment creation
- Status updates via webhook
- Order status changes triggered by delivery events

View logs in Activity Logs section (admin only).

## Testing

### Test Shipment Creation

```bash
# Create a test order first, then:
curl -X POST https://your-domain.com/api/ncm/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD_xxx",
    "destinationCity": "KATHMANDU"
  }'
```

### Test Webhook

```bash
curl -X POST https://your-domain.com/api/ncm/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "tracking_id": "NCM123",
    "status": "Delivered",
    "vendor_return": "False",
    "location": "Kathmandu",
    "updated_at": "2026-01-30T10:00:00Z"
  }'
```

## Security

- All NCM endpoints (except webhook) require authentication
- NCM API key stored server-side only
- Webhook should validate incoming requests (implement signature verification as needed)
- Rate limiting recommended for production

## Troubleshooting

**Cities not loading**
- Check `NUXT_NCM_API_KEY` is set correctly
- Verify NCM API URL is accessible
- Check browser console for errors

**Shipment creation fails**
- Ensure order exists and has customer with phone/address
- Verify destination city is valid NCM branch
- Check NCM API key permissions

**Webhook not updating status**
- Verify webhook URL is publicly accessible
- Check NCM webhook configuration
- Review server logs for errors
- Ensure tracking ID matches existing shipment

## Development

### File Structure

```
server/
  utils/
    ncm.client.ts      # NCM API client
    ncm.mapping.ts     # Status mapping logic
    cache.ts           # Caching utility
  api/ncm/
    cities.get.ts      # Get cities
    shipping-cost.get.ts # Get rates
    create.post.ts     # Create shipment
    track.get.ts       # Track shipment
    webhook.post.ts    # Status webhook
  api/orders/[id]/
    shipment.get.ts    # Get order shipment
  database/
    schema.ts          # Shipments schema

app/
  composables/
    useNCM.ts          # NCM frontend composable
  components/
    NCMBookingButton.vue # Booking modal
  pages/orders/
    [id].vue           # Order detail with tracking

migrations/
  0004_add_ncm_shipments.sql # NCM tables
```

## Support

For NCM API issues, contact Nepal Can Move support:
- Website: https://nepalcanmove.com
- API Documentation: Check NCM partner portal

For integration issues, check:
- Server logs (Nuxt Hub logs in production)
- Activity logs in OpenStock admin panel
- Browser console for frontend errors
