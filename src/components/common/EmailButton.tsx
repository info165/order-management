import React, { useCallback, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { Order } from '../../types';
import { buildGmailComposeLink } from '../../utils/emailMessage';
import { WHATSAPP_MESSAGE_LABELS, WhatsAppMessageKind, getAvailableMessageKinds } from '../../utils/whatsappMessage';
import { FloatingMenu } from './FloatingMenu';

interface EmailButtonProps {
  order: Order;
  // Email addresses from the school's School Registry record (preferred over
  // the older copy stored on the order).
  schoolEmails?: Array<string | null | undefined>;
}

const OPTION_HINTS: Record<WhatsAppMessageKind, string> = {
  dispatched: 'Items, courier & docket details',
  delivered: 'Confirm the delivery was received',
  paymentPending: 'Ask the school for a payment update'
};

const OPTION_DOTS: Record<WhatsAppMessageKind, string> = {
  dispatched: 'bg-sky-400',
  delivered: 'bg-emerald-400',
  paymentPending: 'bg-amber-400'
};

// Opens a small menu of email types (Dispatched / Delivered / Payment Pending
// - only the ones that fit the order's current stage). Picking one opens a
// Gmail compose window on the order's own company account, with the school's
// address and that message ready to review. It only reads the order: it writes
// nothing and never sends anything itself; a person presses Send in Gmail.
export const EmailButton: React.FC<EmailButtonProps> = ({ order, schoolEmails }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setOpen(false), []);

  const kinds = getAvailableMessageKinds(order);
  // Sender / recipient / availability don't depend on which message is picked.
  const { link, sender, to, reason } = buildGmailComposeLink(order, schoolEmails, 'dispatched');

  if (kinds.length === 0) return null;

  if (!link) {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-md bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
        title={reason}
      >
        <Mail className="w-3.5 h-3.5" />
      </span>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-md text-white bg-gradient-to-br from-[#4F8DF7] to-[#2453D6] ring-1 ring-blue-800/25 shadow-sm shadow-blue-600/30 hover:from-[#3B7BEA] hover:to-[#1E45B8] hover:shadow-md hover:shadow-blue-600/40 hover:-translate-y-px active:translate-y-0 transition-all duration-150 cursor-pointer"
        title={`Email ${to.join(', ')} from ${sender}`}
      >
        <Mail className="w-3.5 h-3.5 drop-shadow-sm" />
      </button>

      <FloatingMenu anchorRef={btnRef} open={open} onClose={closeMenu} estimatedHeight={92 + kinds.length * 54} width={256}>
        <div className="px-3 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Send by email
        </div>
        <div className="mx-3 mb-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1.5 text-[10px] leading-snug text-slate-300 space-y-0.5">
          <div className="truncate"><span className="text-slate-500">From </span><span className="font-semibold text-blue-300">{sender}</span></div>
          <div className="truncate"><span className="text-slate-500">To </span>{to.join(', ')}</div>
        </div>
        {kinds.map(kind => (
          <a
            key={kind}
            role="menuitem"
            href={buildGmailComposeLink(order, schoolEmails, kind).link || undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMenu}
            className="flex items-start gap-2.5 px-3 py-2 hover:bg-slate-800 transition-colors"
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${OPTION_DOTS[kind]}`} />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-white">{WHATSAPP_MESSAGE_LABELS[kind]}</span>
              <span className="block text-[10px] leading-snug text-slate-400">{OPTION_HINTS[kind]}</span>
            </span>
          </a>
        ))}
      </FloatingMenu>
    </>
  );
};
