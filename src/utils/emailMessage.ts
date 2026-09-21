import type { Order } from '../types';
import { buildMessage, type WhatsAppMessageKind } from './whatsappMessage';

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

export function buildEmailSubject(order: Order, kind: WhatsAppMessageKind = 'dispatched'): string {
  const contract = clean(order.contractNumber) || clean(order.orderNumber) || clean(order.purchaseOrderNumber);
  const company = clean(order.company).toUpperCase();
  return [company, EMAIL_SUBJECT_TITLES[kind], contract ? `GeM Contract ${contract}` : ''].filter(Boolean).join(' - ');
}

// Same text as the WhatsApp message of that type, minus WhatsApp's *bold*
// markers (they'd show up as stray asterisks in an email) and with the
// WhatsApp-only "contact us on this number" wording adjusted for email.
export function buildEmailBody(order: Order, kind: WhatsAppMessageKind = 'dispatched'): string {
  return buildMessage(order, kind, { forEmail: true }).replace(/\*/g, '');
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
  kind: WhatsAppMessageKind = 'dispatched'
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
