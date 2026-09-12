import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Plus, Trash2 } from 'lucide-react';
import { Order, UserProfile } from '../../types';
import {
  getSystemSettings,
  addStickerSenderCompany as addSenderCompanyToSettings,
  removeStickerSenderCompany as removeSenderCompanyFromSettings
} from '../../services/dataService';

interface PrintStickerModalProps {
  order: Order;
  currentUser: UserProfile;
  onClose: () => void;
}

// Default sender care-of details - the same for every company shipping from
// this address today, but editable below in case the return address ever
// changes (e.g. office relocation) without needing a code change.
const DEFAULT_SENDER_CARE_OF = 'C/O-FUNSCHOLAR INNOVATIONS PVT LTD';
const DEFAULT_SENDER_ADDRESS_LINE = '59B CHOWRINGHEE ROAD, 6TH FLOOR';
const DEFAULT_SENDER_CITY_LINE = 'KOLKATA - 700020';
const DEFAULT_SENDER_PHONE = '9674193747';

// Fallback shown before the real list loads from settings (and if it's
// ever empty) - kept in sync with INITIAL_SETTINGS.stickerSenderCompanies.
const DEFAULT_SENDER_COMPANIES = [
  'Funscholar Innovations Pvt Ltd',
  'Torquev Technologies Pvt Ltd',
  'Arkay Enterprises',
  'Vignan Learning Solutions'
];

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
      <p className="text-lg">(Box No- {boxNumber})</p>
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

export const PrintStickerModal: React.FC<PrintStickerModalProps> = ({ order, currentUser, onClose }) => {
  const [numberOfBoxesInput, setNumberOfBoxesInput] = useState('1');
  const [senderCompanies, setSenderCompanies] = useState<string[]>(DEFAULT_SENDER_COMPANIES);
  const [senderCompany, setSenderCompany] = useState(DEFAULT_SENDER_COMPANIES[0] || '');
  const [showAddSenderCompany, setShowAddSenderCompany] = useState(false);
  const [newSenderCompanyName, setNewSenderCompanyName] = useState('');
  const [isAddingSenderCompany, setIsAddingSenderCompany] = useState(false);
  const [addSenderCompanyError, setAddSenderCompanyError] = useState<string | null>(null);
  const [removingSenderCompany, setRemovingSenderCompany] = useState<string | null>(null);

  useEffect(() => {
    getSystemSettings()
      .then((s) => {
        const list = s.stickerSenderCompanies && s.stickerSenderCompanies.length > 0
          ? s.stickerSenderCompanies
          : DEFAULT_SENDER_COMPANIES;
        setSenderCompanies(list);
        setSenderCompany(list[0] || '');
      })
      .catch(console.error);
  }, []);

  const handleAddSenderCompany = async () => {
    const trimmed = newSenderCompanyName.trim();
    if (!trimmed) return;
    setIsAddingSenderCompany(true);
    setAddSenderCompanyError(null);
    try {
      const updated = await addSenderCompanyToSettings(trimmed, currentUser);
      setSenderCompanies(updated);
      setSenderCompany(trimmed);
      setNewSenderCompanyName('');
      setShowAddSenderCompany(false);
    } catch (err: any) {
      setAddSenderCompanyError(err.message || 'Could not add company.');
    } finally {
      setIsAddingSenderCompany(false);
    }
  };

  const handleRemoveSenderCompany = async (companyName: string) => {
    if (!confirm(`Remove "${companyName}" from the sender company list?`)) return;
    setRemovingSenderCompany(companyName);
    setAddSenderCompanyError(null);
    try {
      const updated = await removeSenderCompanyFromSettings(companyName, currentUser);
      setSenderCompanies(updated);
      if (senderCompany === companyName) {
        setSenderCompany(updated[0] || '');
      }
    } catch (err: any) {
      setAddSenderCompanyError(err.message || 'Could not remove company.');
    } finally {
      setRemovingSenderCompany(null);
    }
  };

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

  // The preview box on screen is much smaller than an actual A4 sheet, but
  // the sticker inside it is rendered at true A4 size (210mm x 297mm) with
  // the exact same font sizes that print - then visually shrunk with a
  // measured CSS scale, so what you see here is a true miniature of the
  // real printout, not a separate cramped layout that overflows/wraps
  // differently.
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const previewInnerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useLayoutEffect(() => {
    function updateScale() {
      if (previewWrapperRef.current && previewInnerRef.current) {
        const wrapperWidth = previewWrapperRef.current.clientWidth;
        const innerWidth = previewInnerRef.current.offsetWidth;
        if (wrapperWidth > 0 && innerWidth > 0) {
          setPreviewScale(wrapperWidth / innerWidth);
        }
      }
    }
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

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
                  ? `Prints ${totalBoxes} pages, numbered "Box No- 1" through "Box No- ${totalBoxes}".`
                  : 'Enter how many boxes this order is split across (e.g. 5 prints 5 pages, numbered 1 to 5).'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 font-semibold">Sender Company</label>
                {currentUser.role === 'SUPER_ADMIN' && !showAddSenderCompany && (
                  <button
                    type="button"
                    onClick={() => setShowAddSenderCompany(true)}
                    className="text-[11px] text-amber-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Company</span>
                  </button>
                )}
              </div>
              <select
                value={senderCompany}
                onChange={(e) => setSenderCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {senderCompanies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {showAddSenderCompany && (
                <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      placeholder="New sender company name"
                      value={newSenderCompanyName}
                      onChange={(e) => setNewSenderCompanyName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSenderCompany();
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSenderCompany}
                      disabled={isAddingSenderCompany || !newSenderCompanyName.trim()}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shrink-0"
                    >
                      {isAddingSenderCompany ? '...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSenderCompany(false);
                        setNewSenderCompanyName('');
                        setAddSenderCompanyError(null);
                      }}
                      className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                  {addSenderCompanyError && (
                    <p className="text-[11px] text-rose-600 font-medium">{addSenderCompanyError}</p>
                  )}
                  <p className="text-[10px] text-amber-700">
                    Saved sender companies appear in this dropdown for every future sticker.
                  </p>

                  {/* Existing sender companies with a delete button each */}
                  <div className="pt-1.5 border-t border-amber-200 space-y-1 max-h-40 overflow-y-auto">
                    {senderCompanies.map((c) => (
                      <div
                        key={c}
                        className="flex items-center justify-between gap-2 px-2 py-1 bg-white rounded border border-amber-100 text-xs"
                      >
                        <span className="truncate text-slate-800">{c}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSenderCompany(c)}
                          disabled={removingSenderCompany === c}
                          title={`Delete "${c}"`}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            <div
              ref={previewWrapperRef}
              className="w-full aspect-[210/297] max-w-[380px] shadow-md border border-slate-200 overflow-hidden relative bg-white"
            >
              <div
                ref={previewInnerRef}
                className="absolute top-0 left-0"
                style={{ width: '210mm', height: '297mm', transform: `scale(${previewScale})`, transformOrigin: 'top left' }}
              >
                <StickerContent boxNumber={1} {...sharedProps} className="w-full h-full" />
              </div>
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
