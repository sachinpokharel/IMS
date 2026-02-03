// NCM status mapping and helper utilities

export type SystemShipmentStatus =
  | 'ORDER_CREATED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_DESTINATION_HUB'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'RTO_IN_TRANSIT'
  | 'RETURNED_TO_SENDER';

/**
 * Map NCM delivery status to system order status
 */
export function mapNcmToOrderStatus(
  ncmStatus: string,
  vendorReturn: string | boolean = false
): 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'delivery_failed' {
  const isRto = vendorReturn === true || vendorReturn === 'True';

  // Return to origin cases
  if (isRto) {
    if (ncmStatus === 'Returned to Sender') return 'cancelled';
    return 'processing'; // RTO in transit
  }

  // Normal delivery flow
  if (ncmStatus === 'Delivered') return 'completed';
  if (ncmStatus === 'Sent for Delivery') return 'processing';
  if (ncmStatus === 'Delivery Failed') return 'delivery_failed';
  
  // Default for other in-transit states
  if (
    ncmStatus.startsWith('Dispatched to') ||
    ncmStatus.startsWith('Arrived at') ||
    ncmStatus === 'Drop off Order Collected'
  ) {
    return 'processing';
  }

  // Order just created
  if (ncmStatus === 'Drop off Order Created') return 'confirmed';

  return 'processing';
}

/**
 * Map NCM status to internal shipment status
 */
export function mapNcmStatus(
  ncmStatus = '',
  vendorReturn: string | boolean = false
): SystemShipmentStatus {
  const isRto = vendorReturn === true || vendorReturn === 'True';

  if (isRto) {
    if (
      ncmStatus.startsWith('Dispatched to') ||
      ncmStatus.startsWith('Arrived at')
    )
      return 'RTO_IN_TRANSIT';
    if (ncmStatus === 'Returned to Sender') return 'RETURNED_TO_SENDER';
    return 'RTO_IN_TRANSIT';
  }

  if (ncmStatus === 'Drop off Order Created') return 'ORDER_CREATED';
  if (ncmStatus === 'Drop off Order Collected') return 'PICKED_UP';
  if (ncmStatus.startsWith('Dispatched to')) return 'IN_TRANSIT';
  if (ncmStatus.startsWith('Arrived at'))
    return 'ARRIVED_AT_DESTINATION_HUB';
  if (ncmStatus === 'Sent for Delivery') return 'OUT_FOR_DELIVERY';
  if (ncmStatus === 'Delivered') return 'DELIVERED';
  if (ncmStatus === 'Delivery Failed') return 'DELIVERY_FAILED';

  return 'IN_TRANSIT';
}

/**
 * Clean phone number for NCM API (removes country code and formatting)
 * Uses existing phone.ts logic
 */
export function cleanPhoneForNcm(
  phone: string | number | null | undefined
): string {
  if (!phone) return '';
  
  let p = String(phone).trim().replace(/\s+/g, '');
  
  // Remove + prefix
  if (p.startsWith('+')) p = p.slice(1);
  
  // Remove country codes (977 for Nepal, 91 for India)
  for (const prefix of ['977', '91']) {
    if (p.startsWith(prefix)) {
      p = p.slice(prefix.length);
      break;
    }
  }
  
  // Remove leading zero
  p = p.replace(/^0+/, '');
  
  // Keep only digits
  return p.replace(/\D/g, '');
}
