import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Download,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { UserProfile, Order } from '../../types';
import {
  parseFileToJSON,
  validateSpreadsheetRows,
  ValidationResult,
  SpreadsheetRow
} from '../../services/importExportService';
import { getAgents, batchImportOrders } from '../../services/dataService';
import { CurrencyFormatter } from '../common/CurrencyFormatter';

interface ImportModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onImportComplete: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ currentUser, onClose, onImportComplete }) => {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [clearPastData, setClearPastData] = useState(true);
  const [importSummary, setImportSummary] = useState<{ imported: number; errors: string[] } | null>(null);

  // Handle file select
  const handleFileDrop = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    try {
      const rows: SpreadsheetRow[] = await parseFileToJSON(selectedFile);
      const agents = await getAgents();
      const agentLookup: { [name: string]: { id: string; name: string; code: string } } = {};
      agents.forEach(a => {
        agentLookup[a.name] = { id: a.agentId, name: a.name, code: a.agentCode };
      });

      const validated = validateSpreadsheetRows(rows, agentLookup);
      setValidationResults(validated);
      setStep('preview');
    } catch (err: any) {
      alert('Failed to parse spreadsheet: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSample = () => {
    const csvContent =
      'SCHOOL NAME,ITEM,L1 PRICE,QUANTITY,CONTRACT/ORDER NO,GEM INVOICE NUMBER,COURIER NAME,DOCKET NUMBER,NUMBER OF BOXES,DATE OF DISPATCH,DELHIVERY STATUS,PAYMENT RECEIVED FROM SCHOOLS,DEALER,CALLING STATUS,REMARKS\n' +
      'JNV Udalguri Assam,ATL Lab Equipment,75000,1,GEMC-511687780112233,GEM-INV-9901,Delhivery,314257999,2,2026-09-02,In Transit,Payment Pending,Satish Pandey,Principal verified bill,Dispatched via Guwahati hub\n' +
      'KV No 2 Raipur,Mathematics Lab Kit,15000,1,GEMC-511687780445566,GEM-INV-9902,India Post,ED887766554IN,1,2026-08-25,Delivered,Paid,Manoj Sarkar,Delivered on 29 Aug,Lab incharge received';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'GovSchool_Order_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteImport = async () => {
    const validRows = validationResults.filter(r => r.isValid).map(r => r.parsedData);
    if (validRows.length === 0) {
      alert('No valid rows found to import.');
      return;
    }

    setIsImporting(true);
    try {
      const ordersToSave: Order[] = validRows.map((v, i) => {
        const orderId = `ORD-IMP-${Date.now()}-${i + 1}`;
        const now = new Date().toISOString();
        return {
          orderId,
          orderNumber: v.orderNumber || `GEMC-IMP-${i + 1}`,
          financialYear: v.financialYear || '2026-27',
          orderDate: v.orderDate || now.split('T')[0],
          orderType: v.orderType || 'GeM Direct',
          schoolId: `SCH-IMP-${i + 1}`,
          schoolName: v.schoolName || 'Unknown School',
          schoolType: v.schoolType || 'Kendriya Vidyalaya',
          schoolCode: v.schoolCode,
          state: v.state || 'India',
          district: v.district,
          schoolAddress: v.schoolAddress,
          principalName: v.principalName,
          schoolContactPhone: v.schoolContactPhone,
          agentId: v.agentId || 'AGT-DIRECT',
          agentName: v.agentName || 'In-House / Direct Tender',
          agentCode: v.agentCode || 'AGT-DIR',
          agentCommissionPercentage: v.agentCommissionPercentage || 10,
          category: v.category || 'Educational Equipment',
          orderValue: v.orderValue || 0,
          taxAmount: 0,
          grossOrderValue: v.orderValue || 0,
          totalAmount: v.orderValue || 0,
          amountReceived: v.amountReceived || 0,
          amountPending: v.paymentStatus === 'PAID' ? 0 : (v.orderValue || 0),
          paymentStatus: v.paymentStatus || 'PAYMENT_PENDING',
          status: v.status || 'PO_RECEIVED',
          dispatchStatus: v.dispatchStatus || 'NOT_READY',
          deliveryStatus: v.deliveryStatus || 'Pending',
          invoiceNumber: v.invoiceNumber,
          invoiceStatus: v.invoiceStatus || 'PENDING',
          bidNumber: v.bidNumber,
          company: v.company || 'FIPL',
          bidSubmissionLastDate: v.bidSubmissionLastDate,
          l1CompanyPrice: v.l1CompanyPrice,
          l2CompanyPrice: v.l2CompanyPrice,
          l3CompanyPrice: v.l3CompanyPrice,
          invoiceDate: v.invoiceDate,
          courierName: v.courierName,
          docketNumber: v.docketNumber,
          numberOfBoxes: v.numberOfBoxes,
          dispatchDate: v.dispatchDate,
          purchaseOrderNumber: v.purchaseOrderNumber || v.orderNumber || `PO-IMP-${i + 1}`,
          callingStatus: v.callingStatus,
          internalNotes: v.internalNotes,
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser.userId,
          createdByName: currentUser.name,
          isArchived: false,
          isDeleted: false
        };
      });

      const res = await batchImportOrders(ordersToSave, currentUser, clearPastData);
      setImportSummary(res);
      onImportComplete();
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = validationResults.filter(r => r.isValid).length;
  const invalidCount = validationResults.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Bulk Order Import (Excel & CSV)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Import Google Sheets, KV/JNV dealer dispatch trackers, and GeM order spreadsheets
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {importSummary ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Successfully Imported {importSummary.imported} Orders!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All valid purchase orders, dispatch tracking dockets, and school details have been registered into the central registry.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm"
                >
                  Return to Orders Dashboard
                </button>
              </div>
            </div>
          ) : step === 'upload' ? (
            <div className="space-y-6">
              {/* Template Download Banner */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Download Pre-formatted Spreadsheet Template</span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Includes headers: SCHOOL NAME, ITEM, L1 PRICE, COURIER NAME, DOCKET NUMBER, DEALER, PAYMENT STATUS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 font-semibold border border-emerald-300 rounded-lg shadow-xs hover:bg-emerald-50 transition-colors whitespace-nowrap self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileDrop(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-8 text-center transition-colors bg-slate-50/50 cursor-pointer"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel';
                  input.onchange = (e: any) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileDrop(e.target.files[0]);
                    }
                  };
                  input.click();
                }}
              >
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-800 text-sm">
                  {isProcessing ? 'Parsing spreadsheet columns...' : 'Click to browse or drop spreadsheet here'}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Supports .xlsx, .xls, and .csv files from Excel, Google Sheets, or GeM Portal
                </p>
              </div>
            </div>
          ) : (
            /* PREVIEW STEP */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">
                    File: {file?.name} ({validationResults.length} rows found)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold font-mono text-[11px]">
                    {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold font-mono text-[11px]">
                      {invalidCount} Invalid
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep('upload');
                    setValidationResults([]);
                  }}
                  className="text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Choose different file</span>
                </button>
              </div>

              {/* Rows Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Validation</th>
                      <th className="px-3 py-2">School Name</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">L1 Price (₹)</th>
                      <th className="px-3 py-2">Dealer / Partner</th>
                      <th className="px-3 py-2">Courier / Docket</th>
                      <th className="px-3 py-2">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validationResults.map((r) => {
                      const d = r.parsedData;
                      return (
                        <tr
                          key={r.rowNumber}
                          className={r.isValid ? 'hover:bg-slate-50/60' : 'bg-rose-50/40'}
                        >
                          <td className="px-3 py-2 font-mono text-slate-500">{r.rowNumber}</td>
                          <td className="px-3 py-2">
                            {r.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Valid
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[11px]"
                                title={r.errors.join(', ')}
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                {r.errors[0]}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900 max-w-[180px] truncate">
                            {d.schoolName || '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-600 max-w-[140px] truncate">{d.category || '—'}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">
                            <CurrencyFormatter amount={d.orderValue || 0} />
                          </td>
                          <td className="px-3 py-2 text-slate-700 max-w-[120px] truncate">{d.agentName || 'Direct'}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {d.docketNumber ? `${d.courierName || 'Courier'}: ${d.docketNumber}` : 'Pending'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {d.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>

            {step === 'preview' && (
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200">
                <input
                  type="checkbox"
                  checked={clearPastData}
                  onChange={(e) => setClearPastData(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 border-slate-300"
                />
                <span>Clear all past data before importing sheet</span>
              </label>
            )}
          </div>

          {step === 'preview' && !importSummary && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={validCount === 0 || isImporting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              <span>{isImporting ? 'Importing Orders...' : `Import ${validCount} Orders`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
