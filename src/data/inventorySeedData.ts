import { Material, Catalogue, Vendor, PurchaseOrder, StockMovement } from '../types';

export const INITIAL_VENDORS: Vendor[] = [
  {
    vendorId: 'VEN-001',
    vendorCode: 'VND-ROBO-01',
    vendorName: 'Bharat Robotics & Micro-Tech Pvt Ltd',
    contactPerson: 'Ramesh Sharma',
    phone: '+91 98765 43210',
    email: 'sales@bharatrobotics.in',
    address: 'Plot 42, Electronics City Phase 1, Bengaluru, Karnataka - 560100',
    gstNumber: '29AABCB1234D1Z5',
    materialsSupplied: ['MAT-MTR-01', 'MAT-SEN-01', 'MAT-SEN-02', 'MAT-CTR-01', 'MAT-BAT-01'],
    paymentTerms: '30 Days Net',
    isActive: true,
    notes: 'Primary preferred OEM supplier for geared motors, Arduino controllers, and ultrasonic sensors.',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    vendorId: 'VEN-002',
    vendorCode: 'VND-ELEC-02',
    vendorName: 'Vigyan Lab Equipments & Sensors Corp',
    contactPerson: 'Sunita Verma',
    phone: '+91 98112 34567',
    email: 'info@vigyanlabcorp.com',
    address: 'B-14, Okhla Industrial Area Phase II, New Delhi - 110020',
    gstNumber: '07AAACV9876E1ZT',
    materialsSupplied: ['MAT-SEN-01', 'MAT-SEN-02', 'MAT-STR-01', 'MAT-CON-01', 'MAT-CAB-01'],
    paymentTerms: 'Against Delivery',
    isActive: true,
    notes: 'Secondary alternative supplier for sensor modules, breadboards, and jumper cables.',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    vendorId: 'VEN-003',
    vendorCode: 'VND-POLY-03',
    vendorName: 'Apex Educational Tools & Chassis Ltd',
    contactPerson: 'Amitabh Sen',
    phone: '+91 94330 98765',
    email: 'procurement@apexedu.co.in',
    address: 'Sector V, Salt Lake City, Kolkata, West Bengal - 700091',
    gstNumber: '19AAACA5555F1ZK',
    materialsSupplied: ['MAT-STR-01', 'MAT-CHAS-01', 'MAT-WHL-01', 'MAT-BOX-01'],
    paymentTerms: '15 Days Net',
    isActive: true,
    notes: 'Supplier of robotic chassis frames, wheels, acrylic mounting plates and packing boxes.',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  }
];

export const INITIAL_MATERIALS: Material[] = [
  {
    materialId: 'MAT-MTR-01',
    sku: 'SKU-MTR-12V',
    name: 'High-Torque DC Geared BO Motor 12V 300RPM',
    category: 'Motors & Actuators',
    description: 'Dual-shaft DC gear motor for school robotics kits and smart vehicle projects',
    unit: 'Nos',
    imageUrl: '',
    preferredVendorId: 'VEN-001',
    preferredVendorName: 'Bharat Robotics & Micro-Tech Pvt Ltd',
    alternativeVendorIds: ['VEN-002'],
    purchasePrice: 65,
    sellingPrice: 120,
    openingInventory: 400,
    currentStock: 250,
    minimumStockLevel: 100,
    isActive: true,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    materialId: 'MAT-SEN-01',
    sku: 'SKU-SEN-US01',
    name: 'Ultrasonic Distance Sensor Module HC-SR04',
    category: 'Sensors',
    description: 'Precision sonar distance sensor with 2cm-400cm range for obstacle avoidance',
    unit: 'Nos',
    imageUrl: '',
    preferredVendorId: 'VEN-001',
    preferredVendorName: 'Bharat Robotics & Micro-Tech Pvt Ltd',
    alternativeVendorIds: ['VEN-002'],
    purchasePrice: 85,
    sellingPrice: 160,
    openingInventory: 300,
    currentStock: 180,
    minimumStockLevel: 80,
    isActive: true,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    materialId: 'MAT-CTR-01',
    sku: 'SKU-CTR-ARD01',
    name: 'Microcontroller Board Atmega328P (Arduino Compatible)',
    category: 'Controllers & Boards',
    description: 'Programmable educational microcontroller with USB interface and digital/analog I/O',
    unit: 'Nos',
    imageUrl: '',
    preferredVendorId: 'VEN-001',
    preferredVendorName: 'Bharat Robotics & Micro-Tech Pvt Ltd',
    alternativeVendorIds: ['VEN-002'],
    purchasePrice: 310,
    sellingPrice: 550,
    openingInventory: 200,
    currentStock: 140,
    minimumStockLevel: 50,
    isActive: true,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    materialId: 'MAT-BAT-01',
    sku: 'SKU-BAT-18650',
    name: 'Rechargeable Li-ion Cell 3.7V 2200mAh',
    category: 'Power & Batteries',
    description: 'High capacity rechargeable lithium battery for robotic vehicle chassis',
    unit: 'Nos',
    imageUrl: '',
    preferredVendorId: 'VEN-001',
    preferredVendorName: 'Bharat Robotics & Micro-Tech Pvt Ltd',
    alternativeVendorIds: [],
    purchasePrice: 110,
    sellingPrice: 190,
    openingInventory: 500,
    currentStock: 320,
    minimumStockLevel: 150,
    isActive: true,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    materialId: 'MAT-CON-01',
    sku: 'SKU-CON-BAT02',
    name: 'Battery Pack Holder 2x18650 with DC Jack',
    category: 'Power & Batteries',
    description: 'Dual-slot battery housing with on-off switch and standard 2.1mm DC plug',
    unit: 'Nos',
    imageUrl: '',
    preferredVendorId: 'VEN-002',
    preferredVendorName: 'Vigyan Lab Equipments & Sensors Corp',
    alternativeVendorIds: ['VEN-001'],
    purchasePrice: 45,
    sellingPrice: 80,
    openingInventory: 300,
    currentStock: 210,
    minimumStockLevel: 80,
    isActive: true,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    materialId: 'MAT-CHAS-01',
    sku: 'SKU-STR-CHAS01',
    name: '2WD Smart Robot Acrylic Chassis Plate Kit',
    category: 'Structural',
    description: 'Laser-cut clear acrylic chassis with speed encoder disks and motor brackets',
    unit: 'Sets',
    imageUrl: '',
    preferredVendorId: 'VEN-003',
    preferredVendorName: 'Apex Educational Tools & Chassis Ltd',
    alternativeVendorIds: [],
    purchasePrice: 180,
    sellingPrice: 320,
    openingInventory: 200,
    currentStock: 120,
    minimumStockLevel: 50,
    isActive: true,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    materialId: 'MAT-WHL-01',
    sku: 'SKU-STR-WHL01',
    name: 'Rubber Grip Robot Wheel 65mm',
    category: 'Structural',
    description: 'Flexible rubber tread robot wheel with center D-hole for BO motor',
    unit: 'Nos',
    imageUrl: '',
    preferredVendorId: 'VEN-003',
    preferredVendorName: 'Apex Educational Tools & Chassis Ltd',
    alternativeVendorIds: ['VEN-001'],
    purchasePrice: 30,
    sellingPrice: 60,
    openingInventory: 500,
    currentStock: 360,
    minimumStockLevel: 120,
    isActive: true,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    materialId: 'MAT-CAB-01',
    sku: 'SKU-CON-JMP40',
    name: 'Multicolor Jumper Wires Ribbon (40 pcs Male to Female)',
    category: 'Consumables',
    description: '20cm rainbow ribbon jumper wires for solderless breadboard prototyping',
    unit: 'Sets',
    imageUrl: '',
    preferredVendorId: 'VEN-002',
    preferredVendorName: 'Vigyan Lab Equipments & Sensors Corp',
    alternativeVendorIds: [],
    purchasePrice: 40,
    sellingPrice: 75,
    openingInventory: 600,
    currentStock: 450,
    minimumStockLevel: 150,
    isActive: true,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    materialId: 'MAT-SEN-02',
    sku: 'SKU-SEN-IR02',
    name: 'Infrared Obstacle & Line Tracking Sensor Module',
    category: 'Sensors',
    description: 'Active digital IR proximity and line sensor with adjustable sensitivity',
    unit: 'Nos',
    imageUrl: '',
    preferredVendorId: 'VEN-001',
    preferredVendorName: 'Bharat Robotics & Micro-Tech Pvt Ltd',
    alternativeVendorIds: ['VEN-002'],
    purchasePrice: 45,
    sellingPrice: 85,
    openingInventory: 400,
    currentStock: 280,
    minimumStockLevel: 100,
    isActive: true,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    materialId: 'MAT-BOX-01',
    sku: 'SKU-PKG-BX01',
    name: 'Custom Plastic Storage Storage Case 12 Compartment',
    category: 'Packaging',
    description: 'Heavy duty transparent partitioned organizer box for school student kits',
    unit: 'Nos',
    imageUrl: '',
    preferredVendorId: 'VEN-003',
    preferredVendorName: 'Apex Educational Tools & Chassis Ltd',
    alternativeVendorIds: [],
    purchasePrice: 120,
    sellingPrice: 220,
    openingInventory: 250,
    currentStock: 160,
    minimumStockLevel: 60,
    isActive: true,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  }
];

export const INITIAL_CATALOGUES: Catalogue[] = [
  {
    catalogueId: 'CAT-ROBO-01',
    catalogueCode: 'ROBO-KIT-A',
    name: 'Robotics & AI Student Kit Package A',
    category: 'Robotics Lab',
    description: 'Flagship school robotics kit with dual motors, ultrasonic sensor, microcontroller, and rechargeable battery pack.',
    standardPrice: 4800,
    isActive: true,
    items: [
      {
        id: 'BOM-101',
        materialId: 'MAT-MTR-01',
        materialName: 'High-Torque DC Geared BO Motor 12V 300RPM',
        sku: 'SKU-MTR-12V',
        unit: 'Nos',
        quantity: 4
      },
      {
        id: 'BOM-102',
        materialId: 'MAT-SEN-01',
        materialName: 'Ultrasonic Distance Sensor Module HC-SR04',
        sku: 'SKU-SEN-US01',
        unit: 'Nos',
        quantity: 2
      },
      {
        id: 'BOM-103',
        materialId: 'MAT-CTR-01',
        materialName: 'Microcontroller Board Atmega328P (Arduino Compatible)',
        sku: 'SKU-CTR-ARD01',
        unit: 'Nos',
        quantity: 1
      },
      {
        id: 'BOM-104',
        materialId: 'MAT-CHAS-01',
        materialName: '2WD Smart Robot Acrylic Chassis Plate Kit',
        sku: 'SKU-STR-CHAS01',
        unit: 'Sets',
        quantity: 1
      },
      {
        id: 'BOM-105',
        materialId: 'MAT-WHL-01',
        materialName: 'Rubber Grip Robot Wheel 65mm',
        sku: 'SKU-STR-WHL01',
        unit: 'Nos',
        quantity: 2
      },
      {
        id: 'BOM-106',
        materialId: 'MAT-CAB-01',
        materialName: 'Multicolor Jumper Wires Ribbon (40 pcs)',
        sku: 'SKU-CON-JMP40',
        unit: 'Sets',
        quantity: 1
      },
      // Hierarchical Sub-assembly: Battery Pack assembly
      {
        id: 'BOM-107',
        materialId: 'MAT-CON-01',
        materialName: 'Battery Pack Holder 2x18650 with DC Jack',
        sku: 'SKU-CON-BAT02',
        unit: 'Nos',
        quantity: 1,
        subComponents: [
          {
            id: 'BOM-107-A',
            materialId: 'MAT-BAT-01',
            materialName: 'Rechargeable Li-ion Cell 3.7V 2200mAh',
            sku: 'SKU-BAT-18650',
            unit: 'Nos',
            quantity: 2
          }
        ]
      },
      {
        id: 'BOM-108',
        materialId: 'MAT-BOX-01',
        materialName: 'Custom Plastic Storage Storage Case 12 Compartment',
        sku: 'SKU-PKG-BX01',
        unit: 'Nos',
        quantity: 1
      }
    ],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    catalogueId: 'CAT-ATL-01',
    catalogueCode: 'ATL-PKG-01',
    name: 'Atal Tinkering Lab (ATL) Standard Package',
    category: 'ATL Lab',
    description: 'Comprehensive ATL package with sensor modules, electronics prototyping, and robotics controllers.',
    standardPrice: 125000,
    isActive: true,
    items: [
      {
        id: 'BOM-201',
        materialId: 'MAT-CTR-01',
        materialName: 'Microcontroller Board Atmega328P (Arduino Compatible)',
        sku: 'SKU-CTR-ARD01',
        unit: 'Nos',
        quantity: 5
      },
      {
        id: 'BOM-202',
        materialId: 'MAT-MTR-01',
        materialName: 'High-Torque DC Geared BO Motor 12V 300RPM',
        sku: 'SKU-MTR-12V',
        unit: 'Nos',
        quantity: 10
      },
      {
        id: 'BOM-203',
        materialId: 'MAT-SEN-01',
        materialName: 'Ultrasonic Distance Sensor Module HC-SR04',
        sku: 'SKU-SEN-US01',
        unit: 'Nos',
        quantity: 6
      },
      {
        id: 'BOM-204',
        materialId: 'MAT-SEN-02',
        materialName: 'Infrared Obstacle & Line Tracking Sensor Module',
        sku: 'SKU-SEN-IR02',
        unit: 'Nos',
        quantity: 8
      },
      {
        id: 'BOM-205',
        materialId: 'MAT-CAB-01',
        materialName: 'Multicolor Jumper Wires Ribbon (40 pcs)',
        sku: 'SKU-CON-JMP40',
        unit: 'Sets',
        quantity: 6
      },
      {
        id: 'BOM-206',
        materialId: 'MAT-CON-01',
        materialName: 'Battery Pack Holder 2x18650 with DC Jack',
        sku: 'SKU-CON-BAT02',
        unit: 'Nos',
        quantity: 4,
        subComponents: [
          {
            id: 'BOM-206-A',
            materialId: 'MAT-BAT-01',
            materialName: 'Rechargeable Li-ion Cell 3.7V 2200mAh',
            sku: 'SKU-BAT-18650',
            unit: 'Nos',
            quantity: 2
          }
        ]
      }
    ],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  },
  {
    catalogueId: 'CAT-COMP-01',
    catalogueCode: 'COMP-SKILL-01',
    name: 'Composite Skill Lab Starter Pack',
    category: 'Composite Skill Lab',
    description: 'Modern vocational curriculum package with applied electronics and automation components.',
    standardPrice: 95000,
    isActive: true,
    items: [
      {
        id: 'BOM-301',
        materialId: 'MAT-CTR-01',
        materialName: 'Microcontroller Board Atmega328P (Arduino Compatible)',
        sku: 'SKU-CTR-ARD01',
        unit: 'Nos',
        quantity: 3
      },
      {
        id: 'BOM-302',
        materialId: 'MAT-MTR-01',
        materialName: 'High-Torque DC Geared BO Motor 12V 300RPM',
        sku: 'SKU-MTR-12V',
        unit: 'Nos',
        quantity: 6
      },
      {
        id: 'BOM-303',
        materialId: 'MAT-SEN-01',
        materialName: 'Ultrasonic Distance Sensor Module HC-SR04',
        sku: 'SKU-SEN-US01',
        unit: 'Nos',
        quantity: 4
      },
      {
        id: 'BOM-304',
        materialId: 'MAT-SEN-02',
        materialName: 'Infrared Obstacle & Line Tracking Sensor Module',
        sku: 'SKU-SEN-IR02',
        unit: 'Nos',
        quantity: 4
      }
    ],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  }
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    poId: 'PO-2026-0001',
    poNumber: 'PO/FS/26-27/001',
    poDate: '2026-04-05',
    vendorId: 'VEN-001',
    vendorName: 'Bharat Robotics & Micro-Tech Pvt Ltd',
    status: 'PO_SENT',
    items: [
      {
        itemId: 'POI-101',
        materialId: 'MAT-MTR-01',
        materialName: 'High-Torque DC Geared BO Motor 12V 300RPM',
        sku: 'SKU-MTR-12V',
        unit: 'Nos',
        quantity: 200,
        unitPrice: 65,
        taxRate: 18,
        taxAmount: 2340,
        totalAmount: 15340,
        receivedQuantity: 0
      },
      {
        itemId: 'POI-102',
        materialId: 'MAT-SEN-01',
        materialName: 'Ultrasonic Distance Sensor Module HC-SR04',
        sku: 'SKU-SEN-US01',
        unit: 'Nos',
        quantity: 100,
        unitPrice: 85,
        taxRate: 18,
        taxAmount: 1530,
        totalAmount: 10030,
        receivedQuantity: 0
      }
    ],
    subTotal: 21500,
    taxTotal: 3870,
    grandTotal: 25370,
    linkedSalesOrderIds: [],
    linkedCatalogueIds: ['CAT-ROBO-01'],
    notes: 'Urgent batch for upcoming Kendriya Vidyalaya institutional delivery commitments.',
    deliveryInfo: 'Central Warehouse, Funscholar Logistics Hub, New Delhi - 110044',
    termsAndConditions: 'Standard 18% GST invoice. Delivery within 10 working days.',
    createdBy: 'admin@funscholar.com',
    createdByName: 'Operations Lead',
    sentAt: '2026-04-05T14:30:00.000Z',
    createdAt: '2026-04-05T11:00:00.000Z',
    updatedAt: '2026-04-05T14:30:00.000Z'
  }
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    movementId: 'MOV-001',
    date: '2026-04-01T09:00:00.000Z',
    timestamp: '2026-04-01T09:00:00.000Z',
    materialId: 'MAT-MTR-01',
    materialName: 'High-Torque DC Geared BO Motor 12V 300RPM',
    quantity: 400,
    type: 'IN',
    movementType: 'IN',
    movementReason: 'OPENING_STOCK',
    reason: 'OPENING_STOCK',
    reference: 'FINANCIAL-YEAR-OPENING-2026',
    user: 'System Seed',
    userName: 'System Seed',
    notes: 'Initial opening stock ledger balance verified'
  },
  {
    movementId: 'MOV-002',
    date: '2026-04-01T09:00:00.000Z',
    timestamp: '2026-04-01T09:00:00.000Z',
    materialId: 'MAT-SEN-01',
    materialName: 'Ultrasonic Distance Sensor Module HC-SR04',
    quantity: 300,
    type: 'IN',
    movementType: 'IN',
    movementReason: 'OPENING_STOCK',
    reason: 'OPENING_STOCK',
    reference: 'FINANCIAL-YEAR-OPENING-2026',
    user: 'System Seed',
    userName: 'System Seed',
    notes: 'Initial opening stock ledger balance verified'
  },
  {
    movementId: 'MOV-003',
    date: '2026-04-01T09:00:00.000Z',
    timestamp: '2026-04-01T09:00:00.000Z',
    materialId: 'MAT-CTR-01',
    materialName: 'Microcontroller Board Atmega328P',
    quantity: 200,
    type: 'IN',
    movementType: 'IN',
    movementReason: 'OPENING_STOCK',
    reason: 'OPENING_STOCK',
    reference: 'FINANCIAL-YEAR-OPENING-2026',
    user: 'System Seed',
    userName: 'System Seed',
    notes: 'Initial opening stock ledger balance verified'
  }
];
