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

export function validateSpreadsheetRows(
  rows: SpreadsheetRow[],
  agentLookup: { [name: string]: { id: string; name: string; code: string } }
): ValidationResult[] {
  const results: ValidationResult[] = [];

  rows.forEach((row, index) => {
    const errors: string[] = [];
    const rowNum = index + 2; // +1 for 0-index, +1 for header row

    // Find school name
    const rawSchool =
      row['SCHOOL NAME'] ||
      row['School Name'] ||
      row['school'] ||
      row['schoolName'] ||
      '';
    const schoolName = String(rawSchool).trim();
    if (!schoolName) {
      errors.push('Missing School Name');
    }

    // Determine School Type
    let schoolType = 'Government School';
    if (schoolName.toUpperCase().includes('JNV') || schoolName.toUpperCase().includes('NAVODAYA')) {
      schoolType = 'Jawahar Navodaya Vidyalaya';
    } else if (schoolName.toUpperCase().includes('PM SHRI')) {
      schoolType = 'PM SHRI School';
    } else if (schoolName.toUpperCase().includes('KV') || schoolName.toUpperCase().includes('KENDRIYA VIDYALAYA')) {
      schoolType = 'Kendriya Vidyalaya';
    }

    // Order value / L1 Price
    const rawPrice =
      row['L1 PRICE'] ||
      row['Price'] ||
      row['orderValue'] ||
      row['Amount'] ||
      '0';
    // Clean formatted strings like "24,998.25"
    const cleanedPrice = String(rawPrice).replace(/[₹,\s]/g, '');
    const orderValue = parseFloat(cleanedPrice) || 0;
    if (orderValue <= 0) {
      errors.push('Order Value must be a valid positive amount');
    }

    // Agent / Dealer
    const rawDealer = row['DEALER'] || row['Dealer'] || row['Agent'] || row['agentName'] || '';
    const dealerName = String(rawDealer).trim();
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
      }
    }

    // Courier & Tracking
    const courierName = String(row['COURIER NAME'] || row['Courier'] || '').trim();
    const docketNumber = String(row['DOCKET NUMBER'] || row['Docket'] || row['Tracking'] || '').trim();
    const numberOfBoxes = String(row['NUMBER OF BOXES'] || row['Boxes'] || '1').trim();
    const dispatchDate = String(row['DATE OF DISPATCH'] || row['Dispatch Date'] || '').trim();

    // Payment status
    const rawPayment = String(row['PAYMENT RECEIVED FROM SCHOOLS'] || row['Payment Status'] || '').toUpperCase();
    let paymentStatus: PaymentStatus = 'PAYMENT_PENDING';
    let amountReceived = 0;
    const taxAmount = Math.round(orderValue * 0.18);
    const grossOrderValue = orderValue + taxAmount;
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

    const rawDelh = String(row['DELHIVERY STATUS'] || row['POD STATUS'] || '').toUpperCase();
    if (rawDelh.includes('DELIVERED')) {
      dispatchStatus = 'DELIVERED';
      status = 'DELIVERED';
      deliveryStatus = 'Delivered';
    } else if (docketNumber || courierName || dispatchDate) {
      dispatchStatus = 'DISPATCHED';
      status = 'DISPATCHED';
      deliveryStatus = 'In Transit';
    }

    const itemCategory = String(row['ITEM'] || row['Category'] || 'Educational Kit').trim();
    const contractNo = String(row['CONTRACT/ORDER NO'] || row['Order Number'] || `ORD-IMP-${index + 1}`).trim();
    const invoiceNo = String(row['GEM INVOICE NUMBER'] || row['Invoice Number'] || '').trim();

    const parsedData: Partial<Order> = {
      orderNumber: contractNo,
      schoolName,
      schoolType: schoolType as any,
      orderType: 'GeM Direct',
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
      status,
      dispatchStatus,
      deliveryStatus,
      paymentStatus,
      courierName: courierName || undefined,
      docketNumber: docketNumber || undefined,
      numberOfBoxes: numberOfBoxes || undefined,
      dispatchDate: dispatchDate || undefined,
      invoiceNumber: invoiceNo || undefined,
      invoiceStatus: invoiceNo ? 'UPLOADED' : 'PENDING',
      callingStatus: String(row['CALLING STATUS'] || '').trim() || undefined,
      internalNotes: String(row['REMARKS'] || '').trim() || undefined
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
