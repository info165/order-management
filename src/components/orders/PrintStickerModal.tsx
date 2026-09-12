import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { Order } from '../../types';

interface PrintStickerModalProps {
  order: Order;
  companies: string[];
  onClose: () => void;
}

// Fixed sender care-of details - identical for every company shipping from
// this address, so these are never editable, only the company name itself
// (picked from the same company list used everywhere else in the app).
const SENDER_CARE_OF = 'C/O-FUNSCHOLAR INNOVATIONS PVT LTD';
const SENDER_ADDRESS_LINE = '59B CHOWRINGHEE ROAD, 6TH FLOOR';
const SENDER_CITY_LINE = 'KOLKATA - 700020';
const SENDER_PHONE = '9674193747';

export const PrintStickerModal: React.FC<PrintStickerModalProps> = ({ order, companies, onClose }) => {
  const [boxNo, setBoxNo] = useState('1');
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 print:hidden">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #sticker-print-area, #sticker-print-area * { visibility: visible; }
          #sticker-print-area {
            position: fixed;
            inset: 0;
            width: 100%;
          }
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
              <label className="block text-slate-600 font-semibold mb-1">Box No.</label>
              <input
                type="text"
                value={boxNo}
                onChange={(e) => setBoxNo(e.target.value)}
                placeholder="e.g. 1 or 1 of 3"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
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
              <p className="text-[10px] text-slate-400 mt-1">
                Return address ({SENDER_CARE_OF}, Kolkata) is fixed for every company.
              </p>
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

            <button
              type="button"
              onClick={handlePrint}
              className="w-full px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>

          {/* Live Preview - this exact block is what actually prints */}
          <div className="bg-slate-100 rounded-xl p-3 flex items-start justify-center">
            <div
              id="sticker-print-area"
              className="bg-white w-full aspect-[210/297] max-w-[380px] shadow-md border border-slate-200 p-8 font-serif text-slate-900 flex flex-col"
            >
              <div className="text-center space-y-1 mb-8">
                <p className="text-sm">Contract No- {order.contractNumber || 'N/A'}</p>
                <p className="text-base font-semibold uppercase">{categoryText || 'N/A'}</p>
                <p className="text-sm">(Box No- {boxNo || '1'})</p>
              </div>

              <div className="space-y-1 text-sm mb-10">
                <p>To</p>
                <p className="font-semibold uppercase">{receiverName}</p>
                <p className="uppercase whitespace-pre-line">{receiverAddress}</p>
                {receiverPincode && <p>PIN - {receiverPincode}</p>}
                <p>PH NO- {receiverPhone || 'N/A'}</p>
              </div>

              <div className="space-y-1 text-sm">
                <p>From,</p>
                <p className="font-semibold uppercase">{senderCompany}</p>
                <p>{SENDER_CARE_OF}</p>
                <p>{SENDER_ADDRESS_LINE}</p>
                <p>{SENDER_CITY_LINE}</p>
                <p>Ph No- {SENDER_PHONE}</p>
              </div>

              <div className="mt-auto pt-16">
                <div className="border-b border-slate-400 w-2/3" />
                <p className="text-[10px] text-slate-400 mt-1">Receiver's Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
