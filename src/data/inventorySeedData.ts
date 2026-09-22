import { Material, Catalogue, Vendor, PurchaseOrder, StockMovement } from '../types';

/**
 * Inventory Seed Data
 *
 * NOTE: All initial seed arrays are kept empty per production mandate.
 * Dummy test demonstration data has been removed so that real user-entered inventory
 * records can be managed cleanly.
 */

export const INITIAL_VENDORS: Vendor[] = [];
export const INITIAL_MATERIALS: Material[] = [];
export const INITIAL_CATALOGUES: Catalogue[] = [];
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];
export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];

// Specific IDs of dummy/test demonstration inventory records previously generated
export const DUMMY_MATERIAL_IDS: string[] = [
  'MAT-MTR-01',
  'MAT-SEN-01',
  'MAT-SEN-02',
  'MAT-CTR-01',
  'MAT-CHAS-01',
  'MAT-WHL-01',
  'MAT-CAB-01',
  'MAT-CON-01',
  'MAT-BAT-01',
  'MAT-BOX-01',
  'MAT-STR-01'
];

export const DUMMY_CATALOGUE_IDS: string[] = [
  'CAT-ROBO-01',
  'CAT-ATL-01',
  'CAT-COMP-01'
];

export const DUMMY_VENDOR_IDS: string[] = [
  'VEN-001',
  'VEN-002',
  'VEN-003'
];

export const DUMMY_PO_IDS: string[] = [
  'PO-001',
  'PO-002',
  'PO-DEMO-01',
  'PO-TEST-01'
];

export const DUMMY_MATERIAL_SKUS: string[] = [
  'SKU-MTR-12V',
  'SKU-SEN-US01',
  'SKU-SEN-US',
  'SKU-CTR-ARD01',
  'SKU-BAT-18650',
  'SKU-CON-BATO2',
  'SKU-STR-CHAS01',
  'SKU-STR-WHL01',
  'SKU-CAB-JMP01',
  'SKU-STR-BOX01'
];

export const DUMMY_MATERIAL_NAME_KEYWORDS: string[] = [
  'bo motor 12v 300rpm',
  'ultrasonic distance sensor module hc-sr04',
  'microcontroller board atmega328p',
  'rechargeable li-ion cell 3.7v 2200mah',
  'battery pack holder 2x18650',
  '2wd smart robot acrylic chassis',
  'rubber grip robot wheel 65mm',
  'multicolor jumper wires ribbon',
  'custom plastic storage storage case',
  'plastic storage storage case'
];

export const DUMMY_VENDOR_NAMES: string[] = [
  'bharat robotics',
  'vigyan lab equipments',
  'apex educational tools'
];
