import type { Order } from '../types';
import {
  buildMessage,
  displayDate,
  getAvailableMessageKinds,
  WHATSAPP_MESSAGE_LABELS,
  type WhatsAppMessageKind
} from './whatsappMessage';

// Email has one message the WhatsApp side doesn't, so it gets its own kind
// type instead of widening WhatsAppMessageKind (which would add it to the
// WhatsApp menu too).
export type EmailMessageKind = WhatsAppMessageKind | 'tds';

export const EMAIL_MESSAGE_LABELS: Record<EmailMessageKind, string> = {
  ...WHATSAPP_MESSAGE_LABELS,
  tds: 'TDS Payment'
};

// The WhatsApp availability rules, plus the TDS email once the order has a
// payment with TDS deducted.
export function getAvailableEmailKinds(
  order: Pick<Order, 'status' | 'paymentStatus'>,
  hasTds: boolean
): EmailMessageKind[] {
  const kinds: EmailMessageKind[] = getAvailableMessageKinds(order);
  if (hasTds) kinds.push('tds');
  return kinds;
}

// The mailbox each company's dispatch emails are sent FROM. An order's
// `company` field decides which one. The site never sends anything itself:
// the button opens a Gmail compose window on that account, ready for a person
// to review and press Send.
export const COMPANY_MAILBOXES: Record<string, string> = {
  ARKAY: 'arkay.pmshri@gmail.com',
  VIGNAN: 'vignanlearningsolutions@gmail.com',
  FIPL: 'admin@funscholar.com',
  TTPL: 'torquevtech@gmail.com'
};

export function getSenderMailbox(order: Pick<Order, 'company'>): string | null {
  const key = String(order.company || '').trim().toUpperCase();
  return COMPANY_MAILBOXES[key] || null;
}

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

// Every valid address found in the given stored values (a field may hold
// several, separated by commas, semicolons, slashes, spaces or "or"). Earlier
// candidates win, duplicates are dropped.
export function collectSchoolEmails(...candidates: Array<string | null | undefined>): string[] {
  const found: string[] = [];
  for (const c of candidates) {
    for (const part of String(c || '').split(/[,;/\s]+|\bor\b/i)) {
      const e = part.trim().replace(/^[<(]+|[>).]+$/g, '');
      if (EMAIL_RE.test(e) && !found.some(x => x.toLowerCase() === e.toLowerCase())) found.push(e);
    }
    if (found.length > 0) break;
  }
  return found;
}

const clean = (v: unknown): string => (v === undefined || v === null ? '' : String(v).trim());

const EMAIL_SUBJECT_TITLES: Record<WhatsAppMessageKind, string> = {
  dispatched: 'Order Dispatched',
  delivered: 'Order Delivered',
  paymentPending: 'Payment Update Requested'
};

export function buildEmailSubject(order: Order, kind: EmailMessageKind = 'dispatched'): string {
  const contract = clean(order.contractNumber) || clean(order.orderNumber) || clean(order.purchaseOrderNumber);
  if (kind === 'tds') {
    return ['TDS Payment Request', contract ? `GeM Contract ${contract}` : ''].filter(Boolean).join(' - ');
  }
  const company = clean(order.company).toUpperCase();
  return [company, EMAIL_SUBJECT_TITLES[kind], contract ? `GeM Contract ${contract}` : ''].filter(Boolean).join(' - ');
}

// Same text as the WhatsApp message of that type, minus WhatsApp's *bold*
// markers (they'd show up as stray asterisks in an email) and with the
// WhatsApp-only "contact us on this number" wording adjusted for email.
export function buildEmailBody(order: Order, kind: EmailMessageKind = 'dispatched'): string {
  if (kind === 'tds') return buildTdsEmailBody(order);
  return buildMessage(order, kind, { forEmail: true }).replace(/\*/g, '');
}

// Asks the school to deposit the TDS it deducted and send back the payment
// details. A line whose detail isn't on the order is left out rather than
// printed blank; the item lines follow the dispatch message's rules (a
// quantity of 1 isn't shown, a single item isn't numbered).
export function buildTdsEmailBody(order: Order): string {
  const contract = clean(order.contractNumber) || clean(order.orderNumber) || clean(order.purchaseOrderNumber);
  const school = clean(order.schoolName);
  const deliveredOn = clean(order.actualDeliveryDate);

  let itemLines = '';
  if (Array.isArray(order.items) && order.items.length > 0) {
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

  const intro =
    'This is regarding the order' +
    (contract ? ` against GeM Contract No. ${contract}` : '') +
    (deliveredOn ? ` delivered on ${displayDate(deliveredOn)}` : '') +
    (school ? ` to ${school}` : '') +
    '.';

  const details: string[] = [];
  if (school) details.push(`School: ${school}`);
  if (contract) details.push(`GeM Contract No.: ${contract}`);
  if (itemLines) details.push(`Items:\n${itemLines}`);
  if (deliveredOn) details.push(`Delivery Date: ${displayDate(deliveredOn)}`);

  const blocks: string[] = ['Dear Sir/Madam,', intro];
  if (details.length) blocks.push(`Order details:\n${details.join('\n')}`);
  blocks.push('We kindly request you to deposit the TDS amount in the bank at the earliest.');
  blocks.push('Once deposited, please share the payment details with us for our records.');
  blocks.push('Thank you.');
  return blocks.join('\n\n');
}

export interface EmailAvailability {
  link: string | null;
  sender: string | null;
  to: string[];
  reason: string;
}

// Gmail compose link on the company's own account (authuser). It opens
// signed-in-only: if that account isn't signed in on this browser, Google asks
// to sign in first. `registryEmails` are the School Registry's stored values,
// tried before the copy kept on the order itself.
export function buildGmailComposeLink(
  order: Order,
  registryEmails: Array<string | null | undefined> = [],
  kind: EmailMessageKind = 'dispatched'
): EmailAvailability {
  const sender = getSenderMailbox(order);
  const to = collectSchoolEmails(...registryEmails, order.schoolEmail);
  if (!sender) return { link: null, sender: null, to, reason: 'This order has no company set, so the sending mailbox is unknown' };
  if (to.length === 0) return { link: null, sender, to, reason: 'No email address on file for this school' };
  const params = [
    'view=cm',
    'fs=1',
    `authuser=${encodeURIComponent(sender)}`,
    `to=${encodeURIComponent(to.join(','))}`,
    `su=${encodeURIComponent(buildEmailSubject(order, kind))}`,
    `body=${encodeURIComponent(buildEmailBody(order, kind))}`
  ];
  const composeUrl = `https://mail.google.com/mail/?${params.join('&')}`;
  // Going straight to Gmail with only `authuser` is NOT safe: when that
  // account isn't signed in on this browser, Gmail quietly falls back to
  // whichever account IS signed in (e.g. a personal one) and opens the compose
  // window there - so the email would go out from the wrong address. Sending
  // the person through Google's account chooser for the company mailbox first
  // makes Google ask them to sign in to THAT account, and only then continue
  // to the compose window.
  const link = `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(sender)}&continue=${encodeURIComponent(composeUrl)}`;
  return { link, sender, to, reason: '' };
}
