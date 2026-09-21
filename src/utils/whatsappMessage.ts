import type { Order } from '../types';
import { toDateInputValue } from './dateInput';

// Turns whatever is stored as a school's phone into a WhatsApp-ready number
// (country code + 10-digit Indian mobile, digits only), or null when there's
// no usable mobile. Stored formats vary: "+91 8382 234120", "980-5999988",
// "9805999988", sometimes several numbers in one field. WhatsApp can't reach
// landlines, so only numbers starting 6-9 count.
export function toWhatsAppNumber(raw?: string | null): string | null {
  if (!raw) return null;
  for (const part of String(raw).split(/[,;/\n]| or /i)) {
    let digits = part.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  }
  return null;
}

// First usable mobile among several stored phone values. The School Registry
// is the source of truth (it's what staff edit), so its numbers are tried
// first; the copy on the order itself is older data and only a fallback.
export function pickWhatsAppNumber(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    const n = toWhatsAppNumber(c);
    if (n) return n;
  }
  return null;
}

// Dispatch dates are stored in mixed formats; show them day-first.
function displayDate(raw?: string | null): string {
  const iso = toDateInputValue(raw);
  if (!iso) return (raw || '').trim();
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

const clean = (v: unknown): string => (v === undefined || v === null ? '' : String(v).trim());

// The "order has been dispatched" message. A line whose detail isn't on the
// order is left out rather than printed blank. Staff can edit the text in
// WhatsApp before sending - nothing is sent by the system.
export function buildDispatchMessage(order: Order, options: { forEmail?: boolean } = {}): string {
  const contract = clean(order.contractNumber) || clean(order.orderNumber) || clean(order.purchaseOrderNumber);

  let itemLines = '';
  if (Array.isArray(order.items) && order.items.length > 0) {
    // A quantity of 1 is left out ("1 nos." beside "No. of Boxes: 2" reads as
    // a contradiction); only quantities above 1 are shown. A single item isn't
    // numbered either.
    const many = order.items.length > 1;
    itemLines = order.items
      .map((it, i) => {
        const qty = Number(it.quantity);
        const qtyText = qty > 1 ? ` – ${clean(it.quantity)} nos.` : '';
        return `${many ? `${i + 1}. ` : ''}${clean(it.productName)}${qtyText}`;
      })
      .join('\n');
  } else {
    itemLines = clean(order.category);
  }

  const details: string[] = [];
  if (clean(order.schoolName)) details.push(`*School:* ${clean(order.schoolName)}`);
  if (contract) details.push(`*GeM Contract No.:* ${contract}`);

  const blocks: string[] = ['Dear Sir/Madam,', 'Your order has been dispatched. Details:'];
  if (details.length) blocks.push(details.join('\n'));
  if (itemLines) blocks.push(`*Items:*\n${itemLines}`);

  const shipping: string[] = [];
  if (clean(order.courierName)) shipping.push(`*Courier:* ${clean(order.courierName)}`);
  if (clean(order.docketNumber)) shipping.push(`*Docket / Tracking No.:* ${clean(order.docketNumber)}`);
  if (clean(order.dispatchDate)) shipping.push(`*Dispatch Date:* ${displayDate(order.dispatchDate)}`);
  if (clean(order.numberOfBoxes)) shipping.push(`*No. of Boxes:* ${clean(order.numberOfBoxes)}`);
  if (shipping.length) blocks.push(shipping.join('\n'));

  blocks.push('Please confirm once received.');
  // "...contact us on this number" only makes sense in a WhatsApp chat; an
  // email has no number to point to, so it's left out of emails.
  if (!options.forEmail) blocks.push('For any queries, please contact us on this number.');
  blocks.push('Thank you.');
  return blocks.join('\n\n');
}

const contractOf = (order: Order): string =>
  clean(order.contractNumber) || clean(order.orderNumber) || clean(order.purchaseOrderNumber);

// "Your order has been delivered" message. A part whose detail isn't on the
// order (contract, school, courier, docket) is left out of the sentence rather
// than printed blank. "this number" points at whichever WhatsApp number sends
// the message - the school sees it on the chat - so it's never a wrong number.
export function buildDeliveredMessage(order: Order, options: { forEmail?: boolean } = {}): string {
  const contract = contractOf(order);
  const school = clean(order.schoolName);
  const courier = clean(order.courierName);
  const docket = clean(order.docketNumber);

  const sentence =
    'This is to inform you that your order ' +
    (contract ? `against *GeM Contract No. ${contract}* ` : '') +
    'has been delivered' +
    (school ? ` to *${school}*` : '') +
    (courier ? ` through *${courier}*` : '') +
    '.';

  const blocks: string[] = ['Dear Sir/Madam,', sentence];
  if (docket) blocks.push(`*Docket/Tracking No.:* ${docket}`);
  blocks.push('Kindly confirm receipt of the delivery at your earliest convenience.');
  // The "contact us on this number" line only makes sense in a WhatsApp chat;
  // an email has no number to point to, so it's left out of emails entirely.
  if (!options.forEmail) {
    blocks.push('In case the consignment has not been received, please contact us on this number for further assistance.');
  }
  blocks.push('Thank you for your cooperation.');
  return blocks.join('\n\n');
}

// "Goods delivered - please update the payment status" reminder.
export function buildPaymentPendingMessage(order: Order): string {
  const contract = contractOf(order);
  const blocks: string[] = [
    'Dear Sir/Madam,',
    'This is to inform you that the goods' +
      (contract ? ` against *GeM Contract No. ${contract}*` : '') +
      ' have been successfully delivered.',
    'Kindly update us regarding the payment status at your earliest convenience.',
    'Once the payment has been processed, we request you to kindly share a screenshot of the payment confirmation for our records.',
    'Thank you for your cooperation.'
  ];
  return blocks.join('\n\n');
}

export type WhatsAppMessageKind = 'dispatched' | 'delivered' | 'paymentPending';

export const WHATSAPP_MESSAGE_LABELS: Record<WhatsAppMessageKind, string> = {
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  paymentPending: 'Payment Pending'
};

// Which messages make sense for an order right now:
//  - Dispatched:      once it has been dispatched (also after delivery)
//  - Delivered:       only once it has been delivered
//  - Payment Pending: only once delivered AND not yet fully paid
export function getAvailableMessageKinds(order: Pick<Order, 'status' | 'paymentStatus'>): WhatsAppMessageKind[] {
  const kinds: WhatsAppMessageKind[] = [];
  if (order.status === 'DISPATCHED' || order.status === 'DELIVERED') kinds.push('dispatched');
  if (order.status === 'DELIVERED') {
    kinds.push('delivered');
    if (order.paymentStatus !== 'PAID') kinds.push('paymentPending');
  }
  return kinds;
}

export function buildMessage(order: Order, kind: WhatsAppMessageKind, options: { forEmail?: boolean } = {}): string {
  if (kind === 'delivered') return buildDeliveredMessage(order, options);
  if (kind === 'paymentPending') return buildPaymentPendingMessage(order);
  return buildDispatchMessage(order, options);
}

// Click-to-chat link: opens WhatsApp (app or web) on the person's own device
// with the number and text filled in; they press Send themselves.
export function buildWhatsAppLink(
  order: Order,
  registryPhones: Array<string | null | undefined> = [],
  kind: WhatsAppMessageKind = 'dispatched'
): string | null {
  const number = pickWhatsAppNumber(...registryPhones, order.schoolContactPhone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildMessage(order, kind))}`;
}

// Whether this order has any usable WhatsApp number at all.
export function hasWhatsAppNumber(order: Order, registryPhones: Array<string | null | undefined> = []): boolean {
  return pickWhatsAppNumber(...registryPhones, order.schoolContactPhone) !== null;
}
