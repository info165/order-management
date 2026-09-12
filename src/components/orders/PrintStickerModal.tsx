import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { Order } from '../../types';

interface PrintStickerModalProps {
  order: Order;
  companies: string[];
  onClose: () => void;
}

// Default sender care-of details - the same for every company shipping from
// this address today, but editable below in case the return address ever
// changes (e.g. office relocation) without needing a code change.
const DEFAULT_SENDER_CARE_OF = 'C/O-FUNSCHOLAR INNOVATIONS PVT LTD';
const DEFAULT_SENDER_ADDRESS_LINE = '59B CHOWRINGHEE ROAD, 6TH FLOOR';
const DEFAULT_SENDER_CITY_LINE = 'KOLKATA - 700020';
const DEFAULT_SENDER_PHONE = '9674193747';

const MAX_BOXES = 500;

interface StickerContentProps {
  boxNumber: number;
  totalBoxes: number;
  contractNumber: string;
  categoryText: string;
  receiverName: string;
  receiverAddress: string;
  receiverPincode: string;
  receiverPhone: string;
  senderCompany: string;
  senderCareOf: string;
  senderAddressLine: string;
  senderCityLine: string;
  senderPhone: string;
  className?: string;
}

// Shared sticker layout - used both for the single on-screen preview and for
// every page rendered into the print portal, so the two can never drift out
// of sync with each other.
const StickerContent: React.FC<StickerContentProps> = ({
  boxNumber,
  totalBoxes,
  contractNumber,
  categoryText,
  receiverName,
  receiverAddress,
  receiverPincode,
  receiverPhone,
  senderCompany,
  senderCareOf,
  senderAddressLine,
  senderCityLine,
  senderPhone,
  className = ''
}) => (
  <div className={`bg-white p-10 font-serif text-slate-900 flex flex-col justify-between ${className}`}>
    <div className="text-center space-y-2">
      <p className="text-lg">Contract No- {contractNumber || 'N/A'}</p>
      <p className="text-2xl font-bold uppercase leading-snug">{categoryText || 'N/A'}</p>
      <p className="text-lg">(Box No- {boxNumber}{totalBoxes > 1 ? ` of ${totalBoxes}` : ''})</p>
    </div>

    <div className="space-y-1.5 text-xl leading-relaxed">
      <p className="text-lg">To</p>
      <p className="font-bold uppercase text-2xl leading-snug">{receiverName}</p>
      <p className="uppercase whitespace-pre-line">{receiverAddress}</p>
      {receiverPincode && <p className="font-semibold">PIN - {receiverPincode}</p>}
      <p className="font-semibold">PH NO- {receiverPhone || 'N/A'}</p>
    </div>

    <div className="space-y-1.5 text-xl leading-relaxed">
      <p className="text-lg">From,</p>
      <p className="font-bold uppercase text-2xl leading-snug">{senderCompany}</p>
      <p>{senderCareOf}</p>
      <p>{senderAddressLine}</p>
      <p>{senderCityLine}</p>
      <p className="font-semibold">Ph No- {senderPhone}</p>
    </div>

    <div>
      <div className="border-b-2 border-slate-500 w-2/3" />
      <p className="text-sm text-slate-400 mt-2">Receiver's Signature</p>
    </div>
  </div>
);

export const PrintStickerModal: React.FC<PrintStickerModalProps> = ({ order, companies, onClose }) => {
  const [numberOfBoxesInput, setNumberOfBoxesInput] = useState('1');
  const [senderCompany, setSenderCompany] = useState(
    order.company && companies.includes(order.company) ? order.company : (companies[0] || '')
  );
  // Pre-filled from the order but editable here - changes only affect this
  // sticker printout, never the order record itself.
  const [categoryText, setCategoryText] = useState(order.category || '');
  const [receiverName, setReceiverName] = useState(order.schoolName || '');
  const [receiverAddress, setReceiverAddress] = useState(order.schoolAddress || '');
  const [receiverPincode, setReceiverPincode] = useState(order.schoolPincode || '');
  const [receiverPhone, setReceiverPhone] = useState(order.schoolContactPhone || '');
  const [senderCareOf, setSenderCareOf] = useState(DEFAULT_SENDER_CARE_OF);
  const [senderAddressLine, setSenderAddressLine] = useState(DEFAULT_SENDER_ADDRESS_LINE);
  const [senderCityLine, setSenderCityLine] = useState(DEFAULT_SENDER_CITY_LINE);
  const [senderPhone, setSenderPhone] = useState(DEFAULT_SENDER_PHONE);

  const totalBoxes = Math.min(MAX_BOXES, Math.max(1, parseInt(numberOfBoxesInput, 10) || 1));

  const sharedProps = {
    totalBoxes,
    contractNumber: order.contractNumber || '',
    categoryText,
    receiverName,
    receiverAddress,
    receiverPincode,
    receiverPhone,
    senderCompany,
    senderCareOf,
    senderAddressLine,
    senderCityLine,
    senderPhone
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          /* visibility:hidden still reserves layout space, so the full-height
             app behind this modal (the orders table etc.) was producing an
             extra blank page. Collapsing #root's height removes that space;
             the print pages below are rendered into a portal attached
             directly to <body> (a sibling of #root), so they're completely
             unaffected by #root's collapse and lay out normally. */
          #root { height: 0 !important; overflow: hidden !important; }
          #sticker-print-portal, #sticker-print-portal * { visibility: visible; }
          #sticker-print-portal {
            position: static;
          }
          .sticker-print-page {
            width: 100%;
            height: 297mm;
            break-after: page;
          }
          .sticker-print-page:last-child { break-after: auto; }
          @page { size: A4; margin: 25mm 20mm; }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-600" />
            <span>Print Box Sticker</span>
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold mb-1 uppercase tracking-wide text-[11px]">
                Contract / GeM No.
              </label>
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-slate-800">
                {order.contractNumber || 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Category / Kit</label>
              <input
                type="text"
                value={categoryText}
                onChange={(e) => setCategoryText(e.target.value)}
                placeholder="e.g. TLM Class 3"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Number of Boxes</label>
              <input
                type="number"
                min={1}
                max={MAX_BOXES}
                value={numberOfBoxesInput}
                onChange={(e) => setNumberOfBoxesInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {totalBoxes > 1
                  ? `Prints ${totalBoxes} pages, numbered "Box No- 1 of ${totalBoxes}" through "Box No- ${totalBoxes} of ${totalBoxes}".`
                  : 'Enter how many boxes this order is split across (e.g. 5 prints 5 pages, 1 to 5).'}
              </p>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Sender Company</label>
              <select
                value={senderCompany}
                onChange={(e) => setSenderCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {companies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <label className="block text-slate-500 font-semibold uppercase tracking-wide text-[11px]">
                Receiver (pre-filled from order, editable)
              </label>

              <div>
                <label className="block text-slate-500 mb-1">School Name</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Address</label>
                <textarea
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  rows={2}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={receiverPincode}
                    onChange={(e) => setReceiverPincode(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <label className="block text-slate-500 font-semibold uppercase tracking-wide text-[11px]">
                Return Address (same for every company, editable)
              </label>

              <div>
                <label className="block text-slate-500 mb-1">Care Of Line</label>
                <input
                  type="text"
                  value={senderCareOf}
                  onChange={(e) => setSenderCareOf(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Address Line</label>
                <input
                  type="text"
                  value={senderAddressLine}
                  onChange={(e) => setSenderAddressLine(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">City / PIN Line</label>
                  <input
                    type="text"
                    value={senderCityLine}
                    onChange={(e) => setSenderCityLine(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="w-full px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{totalBoxes > 1 ? `Print ${totalBoxes} Stickers / Save as PDF` : 'Print / Save as PDF'}</span>
            </button>
          </div>

          {/* Live Preview - shows Box 1 as a representative sample; every
              box gets its own identical page (differing only in the box
              number) when actually printed. */}
          <div className="bg-slate-100 rounded-xl p-3 flex flex-col items-center gap-2">
            <div className="w-full aspect-[210/297] max-w-[380px] shadow-md border border-slate-200 overflow-hidden">
              <StickerContent boxNumber={1} {...sharedProps} className="w-full h-full" />
            </div>
            {totalBoxes > 1 && (
              <p className="text-[11px] text-slate-500 font-medium">
                Showing Box 1 of {totalBoxes} — {totalBoxes - 1} more identical page{totalBoxes > 2 ? 's' : ''} will print, numbered up to {totalBoxes}.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Print-only portal: rendered as a sibling of #root directly under
          <body>, so it's unaffected when #root's height collapses for
          print, and each page can stack normally to paginate correctly. */}
      {createPortal(
        <div id="sticker-print-portal" className="hidden print:block">
          {Array.from({ length: totalBoxes }, (_, i) => i + 1).map((boxNumber) => (
            <StickerContent
              key={boxNumber}
              boxNumber={boxNumber}
              {...sharedProps}
              className="sticker-print-page"
            />
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
