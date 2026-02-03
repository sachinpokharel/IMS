# NCM Integration - Quick Start Guide

Get Nepal Can Move delivery integration running in 5 minutes.

## Prerequisites

- OpenStock installation
- NCM API credentials
- Access to NCM partner portal

## Setup Steps

### 1. Add Environment Variables

Create or update `.env` file:

```bash
# Copy from example
cp .env.example .env

# Add NCM credentials
NUXT_NCM_API_KEY=your-ncm-api-key-here
NUXT_NCM_API_URL=https://portal.nepalcanmove.com/api/v1
NUXT_NCM_ORIGIN_BRANCH=BIRGUNJ
```

**Get your API key:** Login to NCM partner portal → API Settings → Copy key

### 2. Run Migration

```bash
# Development (auto-runs)
npm run dev

# Production (via Nuxt Hub)
# Migration runs automatically on deployment
```

### 3. Test Integration

1. **Create a test order:**
   - Go to Orders → New Order
   - Select customer with phone number
   - Set payment method to "Cash on Delivery"
   - Add products and save

2. **Book delivery:**
   - Open the order detail page
   - Click "Book NCM Delivery" button
   - Select destination city (e.g., KATHMANDU)
   - Review shipping cost and COD amount
   - Click "Book Delivery"

3. **Verify:**
   - ✅ Tracking ID appears
   - ✅ Order status changes to "confirmed"
   - ✅ Shipment tracking section visible
   - ✅ Activity log entry created

### 4. Configure Webhook (Production Only)

In NCM partner portal:

1. Go to Webhook Settings
2. Set webhook URL: `https://your-domain.com/api/ncm/webhook`
3. Select events: Order Status Updates
4. Save configuration

Test webhook:
```bash
curl -X POST https://your-domain.com/api/ncm/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "tracking_id": "YOUR_TRACKING_ID",
    "status": "Sent for Delivery",
    "vendor_return": "False"
  }'
```

## Common Issues

### "NCM API key not configured"
**Fix:** Add `NUXT_NCM_API_KEY` to `.env` and restart server

### "Shipment already exists for this order"
**Fix:** One shipment per order. Delete existing shipment or create new order

### "destination parameter is required"
**Fix:** Select a city from dropdown before booking

### Cities not loading
**Fix:** Check NCM API key is valid. Test: `curl -H "Authorization: Token YOUR_KEY" https://portal.nepalcanmove.com/api/v1/branchlist`

## Features Enabled

✅ **Order Status Auto-Update**
- Delivered → Order status: `completed`
- Delivery Failed → Order status: `delivery_failed`
- Out for Delivery → Order status: `processing`

✅ **COD Payment Sync**
- COD amount = Order total (for cash_on_delivery orders)
- NCM collects payment on delivery

✅ **Real-time Tracking**
- View tracking timeline on order page
- Click "Refresh" for latest status
- Webhook auto-updates (production)

## Next Steps

- [ ] Configure webhook in NCM portal
- [ ] Test with real orders
- [ ] Monitor activity logs
- [ ] Train staff on NCM booking process

## Support

- **Integration Docs:** [NCM_INTEGRATION.md](NCM_INTEGRATION.md)
- **Implementation Details:** [NCM_IMPLEMENTATION_SUMMARY.md](NCM_IMPLEMENTATION_SUMMARY.md)
- **NCM Support:** https://nepalcanmove.com/contact

---

**Ready to go!** Start booking deliveries from the orders page. 🚚
