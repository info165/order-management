import * as XLSX from 'xlsx';
import { Order, OrderStatus, PaymentStatus, DispatchStatus } from '../types';

export interface SpreadsheetRow {
  [key: string]: any;
}

export interface FieldMapping {
  spreadsheetColumn: string;
  targetField: string;
}

export interface ValidationResult {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  parsedData: Partial<Order>;
}

// Standard header aliases to automatically map uploaded spreadsheets
export const DEFAULT_COLUMN_MAPPINGS: { [key: string]: keyof Order } = {
  'SCHOOL NAME': 'schoolName',
  'school': 'schoolName',
  'school_name': 'schoolName',
  'ITEM': 'category',
  'item': 'category',
  'product': 'category',
  'L1 PRICE': 'orderValue',
  'price': 'orderValue',
  'order_value': 'orderValue',
  'QUANTITY': 'numberOfBoxes',
  'CONTRACT/ORDER NO': 'contractNumber',
  'order_no': 'orderNumber',
  'GEM INVOICE NUMBER': 'invoiceNumber',
  'invoice_number': 'invoiceNumber',
  'COURIER NAME': 'courierName',
  'courier': 'courierName',
  'DOCKET NUMBER': 'docketNumber',
  'tracking_number': 'docketNumber',
  'NUMBER OF BOXES': 'numberOfBoxes',
  'DATE OF DISPATCH': 'dispatchDate',
  'dispatch_date': 'dispatchDate',
  'PAYMENT RECEIVED FROM SCHOOLS': 'paymentStatus',
  'payment_status': 'paymentStatus',
  'DEALER': 'agentName',
  'agent': 'agentName',
  'CALLING STATUS': 'callingStatus',
  'REMARKS': 'internalNotes'
};

export function parseFileToJSON(file: File): Promise<SpreadsheetRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: SpreadsheetRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

function getField(row: SpreadsheetRow, ...candidates: string[]): string {
  const rowKeys = Object.keys(row);
  for (const cand of candidates) {
    const candNorm = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const rKey of rowKeys) {
      const rKeyNorm = rKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (rKeyNorm === candNorm && row[rKey] !== undefined && row[rKey] !== null) {
        return String(row[rKey]).trim();
      }
    }
  }
  return '';
}

export function validateSpreadsheetRows(
  rows: SpreadsheetRow[],
  agentLookup: { [name: string]: { id: string; name: string; code: string } }
): ValidationResult[] {
  const results: ValidationResult[] = [];

  rows.forEach((row, index) => {
    const errors: string[] = [];
    const rowNum = index + 2; // +1 for 0-index, +1 for header row

    // Check if empty or separator row
    const rawSchool = getField(row, 'SCHOOL NAME', 'School Name', 'school', 'schoolName');
    const rawItem = getField(row, 'ITEM', 'Item', 'category', 'product', 'Description');
    const rawContract = getField(row, 'CONTRACT/ORDER NO', 'CONTRACT NO', 'Order Number', 'order_no', 'contractNumber');
    const rawBid = getField(row, 'Bid Number', 'Bid No', 'bidNumber', 'bid');

    // Ignore completely empty row or trailing garbage rows
    if (!rawSchool && !rawItem && !rawContract && !rawBid) {
      return;
    }

    const schoolName = rawSchool;
    if (!schoolName) {
      errors.push('Missing School Name');
    }

    // Determine School Type
    let schoolType = 'Government School';
    if (/JNV|NAVODAYA/i.test(schoolName)) {
      schoolType = 'Jawahar Navodaya Vidyalaya';
    } else if (/PM SHRI/i.test(schoolName)) {
      schoolType = 'PM SHRI School';
    } else if (/KV|KENDRIYA VIDYALAYA/i.test(schoolName)) {
      schoolType = 'Kendriya Vidyalaya';
    }

    // Order value / L1 Price
    const rawPrice = getField(row, 'L1 PRICE', 'Price', 'orderValue', 'Amount', 'Total');
    const cleanedPrice = rawPrice.replace(/[₹,\s]/g, '');
    const orderValue = parseFloat(cleanedPrice) || 0;
    if (orderValue <= 0) {
      errors.push('Order Value must be a valid positive amount');
    }

    // Agent / Dealer
    const dealerName = getField(row, 'DEALER', 'Dealer', 'Agent', 'agentName');
    let agentId = 'AGT-DIRECT';
    let agentName = 'In-House / Direct Tender';
    let agentCode = 'AGT-DIR';

    if (dealerName) {
      const match = Object.values(agentLookup).find(a =>
        a.name.toLowerCase().includes(dealerName.toLowerCase()) ||
        dealerName.toLowerCase().includes(a.name.toLowerCase())
      );
      if (match) {
        agentId = match.id;
        agentName = match.name;
        agentCode = match.code;
      } else {
        agentName = dealerName;
        agentCode = `AGT-${dealerName.slice(0, 3).toUpperCase()}`;
      }
    }

    // Courier & Tracking
    const courierName = getField(row, 'COURIER NAME', 'Courier', 'courierName');
    const docketNumber = getField(row, 'DOCKET NUMBER', 'Docket', 'Tracking', 'docketNumber');
    const numberOfBoxes = getField(row, 'NUMBER OF BOXES', 'Boxes', 'numberOfBoxes') || '1';
    const dispatchDate = getField(row, 'DATE OF DISPATCH', 'Dispatch Date', 'dispatchDate');

    // Payment status
    const rawPayment = getField(row, 'PAYMENT RECEIVED FROM SCHOOLS', 'PAYMENT  RECEIVED FROM SCHOOLS', 'Payment Status', 'paymentStatus').toUpperCase();
    let paymentStatus: PaymentStatus = 'PAYMENT_PENDING';
    let amountReceived = 0;
    const taxAmount = 0;
    const grossOrderValue = orderValue;
    let amountPending = grossOrderValue;

    if (rawPayment.includes('PAID') || rawPayment.includes('RECEIVED')) {
      paymentStatus = 'PAID';
      amountReceived = grossOrderValue;
      amountPending = 0;
    }

    // Order & Dispatch Status
    let dispatchStatus: DispatchStatus = 'NOT_READY';
    let status: OrderStatus = 'PO_RECEIVED';
    let deliveryStatus: 'Pending' | 'In Transit' | 'Delivered' = 'Pending';

    const rawDelh = getField(row, 'DELHIVERY STATUS', 'POD STATUS', 'Delivery Status').toUpperCase();
    if (rawDelh.includes('DELIVERED')) {
      dispatchStatus = 'DELIVERED';
      status = 'DELIVERED';
      deliveryStatus = 'Delivered';
    } else if (docketNumber || courierName || dispatchDate) {
      dispatchStatus = 'DISPATCHED';
      status = 'DISPATCHED';
      deliveryStatus = 'In Transit';
    }

    const itemCategory = rawItem || 'Educational Kit';
    const bidNumber = rawBid;
    const contractNo = rawContract || (bidNumber ? `BID-${bidNumber.replace(/[^A-Za-z0-9]/g, '')}` : `ORD-IMP-${index + 1}`);
    const invoiceNo = getField(row, 'GEM INVOICE NUMBER', 'Invoice Number', 'invoiceNumber');
    const invoiceDate = getField(row, 'GEM INVOICE DATE', 'Invoice Date', 'invoiceDate');
    const company = getField(row, 'COMPANY', 'Company', 'companyName') || 'FIPL';
    const bidDate = getField(row, 'Bid Submission Last Date', 'bidSubmissionLastDate');
    const l1Comp = getField(row, 'L1 Company/Price', 'L1 Company / Price');
    const l2Comp = getField(row, 'L2 Company/Price', 'L2 Company / Price');
    const l3Comp = getField(row, 'L3 Company/Price', 'L3 Company / Price');
    const shippingStatus = getField(row, 'SHIPPING STATUS', 'Shipping Status');
    const callingStatus = getField(row, 'CALLING STATUS', 'Calling Status');
    const remarks = getField(row, 'REMARKS', 'Remarks', 'Notes', 'internalNotes');

    const parsedData: Partial<Order> = {
      orderNumber: contractNo,
      purchaseOrderNumber: contractNo,
      contractNumber: contractNo,
      bidNumber: bidNumber || undefined,
      schoolName,
      schoolType: schoolType as any,
      orderType: bidNumber ? 'GeM Bid' : 'GeM Direct',
      category: itemCategory,
      orderValue,
      taxAmount,
      grossOrderValue,
      totalAmount: grossOrderValue,
      amountReceived,
      amountPending,
      agentId,
      agentName,
      agentCode,
      company,
      bidSubmissionLastDate: bidDate || undefined,
      l1CompanyPrice: l1Comp || undefined,
      l2CompanyPrice: l2Comp || undefined,
      l3CompanyPrice: l3Comp || undefined,
      status,
      dispatchStatus,
      deliveryStatus,
      paymentStatus,
      courierName: courierName || undefined,
      docketNumber: docketNumber || undefined,
      numberOfBoxes: numberOfBoxes || undefined,
      dispatchDate: dispatchDate || undefined,
      invoiceNumber: invoiceNo || undefined,
      invoiceDate: invoiceDate || undefined,
      invoiceStatus: invoiceNo ? 'UPLOADED' : 'PENDING',
      callingStatus: callingStatus || undefined,
      internalNotes: remarks || undefined
    };

    results.push({
      rowNumber: rowNum,
      isValid: errors.length === 0,
      errors,
      parsedData
    });
  });

  return results;
}

// ----------------------------------------------------
// EXPORT SERVICE
// ----------------------------------------------------
export function exportOrdersToExcel(orders: Order[], fileName = 'Government_School_Orders.xlsx'): void {
  const data = orders.map((o, idx) => ({
    'SL NO.': idx + 1,
    'ORDER ID': o.orderId,
    'CONTRACT / ORDER NO': o.contractNumber || o.orderNumber,
    'FINANCIAL YEAR': o.financialYear,
    'ORDER DATE': o.orderDate,
    'SCHOOL NAME': o.schoolName,
    'SCHOOL TYPE': o.schoolType,
    'CATEGORY / ITEM': o.category,
    'AGENT / ASSOCIATE': o.agentName,
    'AGENT CODE': o.agentCode,
    'ORDER VALUE (₹)': o.orderValue,
    'GST AMOUNT (₹)': o.taxAmount,
    'GROSS TOTAL (₹)': o.grossOrderValue || o.totalAmount,
    'ORDER STATUS': o.status,
    'DISPATCH STATUS': o.dispatchStatus,
    'COURIER': o.courierName || 'N/A',
    'DOCKET / TRACKING NO': o.docketNumber || 'N/A',
    'DATE OF DISPATCH': o.dispatchDate || 'N/A',
    'DELIVERY STATUS': o.deliveryStatus,
    'INVOICE NUMBER': o.invoiceNumber || 'N/A',
    'PAYMENT STATUS': o.paymentStatus,
    'AMOUNT RECEIVED (₹)': o.amountReceived || 0,
    'AMOUNT PENDING (₹)': o.amountPending || 0,
    'LAST PAYMENT DATE': o.lastPaymentDate || 'N/A',
    'CALLING STATUS': o.callingStatus || '',
    'REMARKS': o.internalNotes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  // Auto-fit column widths
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, 14)
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
  XLSX.writeFile(workbook, fileName);
}

export function exportOrdersToCSV(orders: Order[], fileName = 'Government_School_Orders.csv'): void {
  const data = orders.map((o, idx) => ({
    'SL NO.': idx + 1,
    'ORDER ID': o.orderId,
    'CONTRACT NO': o.contractNumber || o.orderNumber,
    'SCHOOL NAME': o.schoolName,
    'SCHOOL TYPE': o.schoolType,
    'ITEM': o.category,
    'AGENT': o.agentName,
    'ORDER VALUE': o.orderValue,
    'GROSS TOTAL': o.grossOrderValue || o.totalAmount,
    'ORDER STATUS': o.status,
    'DISPATCH STATUS': o.dispatchStatus,
    'COURIER': o.courierName || '',
    'DOCKET NO': o.docketNumber || '',
    'PAYMENT STATUS': o.paymentStatus,
    'AMOUNT RECEIVED': o.amountReceived || 0,
    'AMOUNT PENDING': o.amountPending || 0
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
