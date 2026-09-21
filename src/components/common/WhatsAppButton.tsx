import React, { useCallback, useRef, useState } from 'react';
import { Order } from '../../types';
import {
  WHATSAPP_MESSAGE_LABELS,
  WhatsAppMessageKind,
  buildWhatsAppLink,
  getAvailableMessageKinds,
  hasWhatsAppNumber
} from '../../utils/whatsappMessage';
import { FloatingMenu } from './FloatingMenu';

interface WhatsAppButtonProps {
  order: Order;
  // Phone numbers from the school's School Registry record (preferred over
  // the older copy stored on the order).
  schoolPhones?: Array<string | null | undefined>;
}

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

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

// Opens a small menu of message types (Dispatched / Delivered / Payment
// Pending - only the ones that fit the order's current stage). Picking one
// opens WhatsApp with the school's number and that message ready to edit.
// It only reads the order: it writes nothing and never sends anything itself;
// a person presses Send in WhatsApp.
export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ order, schoolPhones }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setOpen(false), []);

  const kinds = getAvailableMessageKinds(order);
  const canMessage = hasWhatsAppNumber(order, schoolPhones);

  if (kinds.length === 0) return null;

  if (!canMessage) {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-md bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
        title="No WhatsApp-able mobile number on file for this school"
      >
        <WhatsAppIcon className="w-3.5 h-3.5" />
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
        className="inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-md text-white bg-gradient-to-br from-[#2BD96B] to-[#0E9F6E] ring-1 ring-emerald-700/25 shadow-sm shadow-emerald-600/30 hover:from-[#25D366] hover:to-[#0B8A5F] hover:shadow-md hover:shadow-emerald-600/40 hover:-translate-y-px active:translate-y-0 transition-all duration-150 cursor-pointer"
        title="Message the school on WhatsApp"
      >
        <WhatsAppIcon className="w-3.5 h-3.5 drop-shadow-sm" />
      </button>

      <FloatingMenu anchorRef={btnRef} open={open} onClose={closeMenu} estimatedHeight={44 + kinds.length * 54}>
        <div className="px-3 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Send on WhatsApp
        </div>
        {kinds.map(kind => (
          <a
            key={kind}
            role="menuitem"
            href={buildWhatsAppLink(order, schoolPhones, kind) || undefined}
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
