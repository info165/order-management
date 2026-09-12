import { Agent, School, Product, Order, UserProfile, SystemSettings } from '../types';
import { REAL_SHEET_ORDERS, REAL_SHEET_SCHOOLS } from './realSheetOrders';
import { EQUIPMENT_CATEGORIES } from '../utils/orderCategories';

export const INITIAL_SETTINGS: SystemSettings = {
  orderIdPrefix: 'ORD-2026',
  currentFinancialYear: '2026-27',
  availableFinancialYears: ['2026-27', '2025-26', '2024-25'],
  categories: EQUIPMENT_CATEGORIES,
  schoolTypes: [
    'Kendriya Vidyalaya',
    'Jawahar Navodaya Vidyalaya',
    'PM SHRI School',
    'Government School',
    'State Model School',
    'Other'
  ],
  paymentModes: ['NEFT', 'RTGS', 'IMPS', 'Cheque', 'DD', 'PFMS', 'Other'],
  dispatchModes: ['Courier', 'India Post', 'Transport', 'Company Vehicle', 'Other'],
  couriers: ['Delhivery', 'India Post', 'Trackon', 'DTDC', 'Blue Dart', 'TCI Express', 'Other'],
  companies: ['FIPL', 'ARKAY', 'VIGNAN', 'TTPL'],
  stickerSenderCompanies: [
    'Funscholar Innovations Pvt Ltd',
    'Torquev Technologies Pvt Ltd',
    'Arkay Enterprises',
    'Vignan Learning Solutions'
  ]
};

export const INITIAL_AGENTS: Agent[] = [
  {
    agentId: 'AGT-0001',
    agentCode: 'AGT-0001',
    name: 'SATISH PANDEY',
    email: 'satish.pandey@agents.govschool.in',
    phone: '+91 98391 24501',
    companyName: 'Pandey Educational Associates',
    address: 'Varanasi / Lucknow, Uttar Pradesh',
    isActive: true,
    userId: 'user_satish_pandey',
    notes: 'Handles JNV & KV institutions in UP, Bihar, Meghalaya & North East clusters',
    commissionRate: 8.5,
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z'
  },
  {
    agentId: 'AGT-0002',
    agentCode: 'AGT-0002',
    name: 'Manoj Sarkar',
    email: 'manoj.sarkar@agents.govschool.in',
    phone: '+91 94350 88219',
    companyName: 'Eastern Tech Solutions',
    address: 'Guwahati / Nagaon, Assam',
    isActive: true,
    userId: 'user_manoj_sarkar',
    notes: 'Primary coordinator for PM SHRI KV Nagaon and Assam regional schools',
    commissionRate: 8.0,
    createdAt: '2026-04-10T11:00:00Z',
    updatedAt: '2026-08-28T14:00:00Z'
  },
  {
    agentId: 'AGT-0003',
    agentCode: 'AGT-0003',
    name: 'ADITYA VIGNAN',
    email: 'aditya.vignan@agents.govschool.in',
    phone: '+91 97290 31140',
    companyName: 'Vignan Edutech Enterprises',
    address: 'Ambala / Chandigarh, Haryana',
    isActive: true,
    userId: 'user_aditya_vignan',
    notes: 'Handles Haryana and Punjab region PM SHRI KVs and ATL tenders',
    commissionRate: 9.0,
    createdAt: '2026-05-01T09:00:00Z',
    updatedAt: '2026-08-25T16:00:00Z'
  },
  {
    agentId: 'AGT-DIRECT',
    agentCode: 'AGT-DIR',
    name: 'In-House / Direct Tender',
    email: 'direct@funscholar.com',
    phone: '+91 11 4100 8900',
    companyName: 'Funscholar Internal Sales',
    address: 'Corporate HQ, New Delhi',
    isActive: true,
    userId: 'user_operations',
    notes: 'Direct institutional orders placed without field agent intermediaries',
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: '2026-08-01T09:00:00Z'
  }
];

export const INITIAL_USERS: UserProfile[] = [
  {
    userId: 'user_super_admin',
    name: 'Operations Director',
    email: 'info@funscholar.com',
    username: 'superadmin',
    password: 'admin@funscholar',
    phone: '+91 98110 00001',
    role: 'SUPER_ADMIN',
    isActive: true,
    issuedBy: 'System Root',
    issuedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    lastLoginAt: '2026-09-03T05:00:00Z'
  },
  {
    userId: 'user_data_entry',
    name: 'Priya Sharma',
    email: 'dataentry@funscholar.com',
    username: 'dataentry',
    password: 'entry@2026',
    phone: '+91 98110 00005',
    role: 'DATA_ENTRY_OPERATOR',
    isActive: true,
    issuedBy: 'info@funscholar.com',
    issuedAt: '2026-02-01T10:00:00Z',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z',
    lastLoginAt: '2026-09-02T11:00:00Z'
  },
  {
    userId: 'user_operations',
    name: 'Operations Manager',
    email: 'operations@funscholar.com',
    username: 'operations',
    password: 'ops@2026',
    phone: '+91 98110 00002',
    role: 'ADMIN',
    isActive: true,
    issuedBy: 'info@funscholar.com',
    issuedAt: '2026-01-05T00:00:00Z',
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-08-20T00:00:00Z'
  },
  {
    userId: 'user_accounts',
    name: 'Accounts & Billing Head',
    email: 'accounts@funscholar.com',
    username: 'accounts',
    password: 'accounts@2026',
    phone: '+91 98110 00003',
    role: 'ACCOUNTS',
    isActive: true,
    issuedBy: 'info@funscholar.com',
    issuedAt: '2026-01-10T00:00:00Z',
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-08-25T00:00:00Z'
  },
  {
    userId: 'user_dispatch',
    name: 'Logistics Coordinator',
    email: 'dispatch@funscholar.com',
    username: 'dispatch',
    password: 'dispatch@2026',
    phone: '+91 98110 00004',
    role: 'DISPATCH',
    isActive: true,
    issuedBy: 'info@funscholar.com',
    issuedAt: '2026-01-12T00:00:00Z',
    createdAt: '2026-01-12T00:00:00Z',
    updatedAt: '2026-08-28T00:00:00Z'
  },
  {
    userId: 'user_satish_pandey',
    name: 'Satish Pandey',
    email: 'satish.pandey@agents.govschool.in',
    username: 'satish.pandey',
    password: 'agent@2026',
    phone: '+91 98391 24501',
    role: 'AGENT',
    agentId: 'AGT-0001',
    agentCode: 'AGT-0001',
    state: 'Uttar Pradesh / Bihar / Meghalaya',
    isActive: true,
    issuedBy: 'info@funscholar.com',
    issuedAt: '2026-04-01T10:00:00Z',
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z'
  },
  {
    userId: 'user_manoj_sarkar',
    name: 'Manoj Sarkar',
    email: 'manoj.sarkar@agents.govschool.in',
    username: 'manoj.sarkar',
    password: 'agent@2026',
    phone: '+91 94350 88219',
    role: 'AGENT',
    agentId: 'AGT-0002',
    agentCode: 'AGT-0002',
    state: 'Assam & North East',
    isActive: true,
    issuedBy: 'info@funscholar.com',
    issuedAt: '2026-04-10T11:00:00Z',
    createdAt: '2026-04-10T11:00:00Z',
    updatedAt: '2026-08-28T14:00:00Z'
  },
  {
    userId: 'user_aditya_vignan',
    name: 'Aditya Vignan',
    email: 'aditya.vignan@agents.govschool.in',
    username: 'aditya.vignan',
    password: 'agent@2026',
    phone: '+91 97290 31140',
    role: 'AGENT',
    agentId: 'AGT-0003',
    agentCode: 'AGT-0003',
    state: 'Haryana & Punjab',
    isActive: true,
    issuedBy: 'info@funscholar.com',
    issuedAt: '2026-05-01T09:00:00Z',
    createdAt: '2026-05-01T09:00:00Z',
    updatedAt: '2026-08-25T16:00:00Z'
  }
];

export const INITIAL_SCHOOLS: School[] = REAL_SHEET_SCHOOLS;

export const INITIAL_PRODUCTS: Product[] = [
  {
    productId: 'PROD-ATL-01',
    name: 'ATL Items (Customised Lab Package)',
    category: 'ATL Items',
    description: 'Atal Tinkering Lab comprehensive package conforming to NITI Aayog guidelines including electronic modules, 3D printing supplies, mechanical building sets.',
    sku: 'FIPL-ATL-100K',
    defaultPrice: 100000,
    isActive: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z'
  },
  {
    productId: 'PROD-ROB-01',
    name: 'Robotics Kit (Arduino & Microcontroller Lab)',
    category: 'Robotics Kit',
    description: 'Robotics kit with robotic chassis, obstacle avoidance sensors, Bluetooth control module, motors, and microcontrollers.',
    sku: 'FIPL-ROB-25K',
    defaultPrice: 24999,
    isActive: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z'
  },
  {
    productId: 'PROD-ELE-01',
    name: 'Basic Electronic Kit (Arduino with 2-Wheel Chassis)',
    category: 'Basic Electronic Kit',
    description: 'Introductory electronics set with solderless breadboard, active/passive components, LED arrays, sensors, and 2-wheel robot chassis.',
    sku: 'ARKAY-ELE-25K',
    defaultPrice: 24999.65,
    isActive: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z'
  },
  {
    productId: 'PROD-SCI-01',
    name: 'Science Circle (Hands-on Experiential Set)',
    category: 'Science Circle',
    description: 'Interactive science discovery kits for middle and secondary school physics and optics experiments.',
    sku: 'FIPL-SCICIRCLE-5K',
    defaultPrice: 5000,
    isActive: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z'
  },
  {
    productId: 'PROD-MTH-01',
    name: 'Maths Circle (Geometric & Manipulatives Set)',
    category: 'Maths Circle',
    description: 'Mathematics manipulative materials for conceptual learning of algebra, fractions, geometry, and circles.',
    sku: 'TTPL-MTHCIRCLE-5K',
    defaultPrice: 5000,
    isActive: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z'
  },
  {
    productId: 'PROD-MTH-PRI',
    name: 'MATHS PRIMARY SET 1 KIT',
    category: 'MATHS PRIMARY SET 1 KIT',
    description: 'Primary school mathematics laboratory kit with Abacus, base-10 blocks, geoboard, and fraction discs.',
    sku: 'ARKAY-MTHPRI-10K',
    defaultPrice: 10000,
    isActive: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z'
  },
  {
    productId: 'PROD-MTH-SEC',
    name: 'MATHS HIGHER SECONDARY KIT SET 1',
    category: 'MATHS HIGHER SECONDARY KIT',
    description: 'Higher secondary mathematics apparatus including 3D coordinate frame, conic section models, and trigonometry boards.',
    sku: 'FIPL-MTHSEC-10K',
    defaultPrice: 10000,
    isActive: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z'
  },
  {
    productId: 'PROD-SKL-01',
    name: '21st Century Skills Kit',
    category: '21st Century Skills',
    description: 'Experiential problem-solving kit fostering critical thinking, collaboration, and basic design thinking exercises.',
    sku: 'ARKAY-21ST-25K',
    defaultPrice: 25000,
    isActive: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z'
  },
  {
    productId: 'PROD-CIT-01',
    name: 'Citizenship Skill Kit',
    category: 'Citizenship Skill Kit',
    description: 'Social awareness, civic literacy, and environmental stewardship experiential laboratory models.',
    sku: 'FIPL-CITIZEN-25K',
    defaultPrice: 25000,
    isActive: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z'
  },
  {
    productId: 'PROD-TLM-01',
    name: 'Teaching-Learning Material (/500 PER STUDENTS)',
    category: 'Teaching-Learning Material (TLM)',
    description: 'Standardised student-level TLM packet per NEP 2020 guidelines for class 1 to class 5 foundational literacy and numeracy.',
    sku: 'FIPL-TLM-500',
    defaultPrice: 24998.25,
    isActive: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z'
  }
];

export const INITIAL_ORDERS: Order[] = REAL_SHEET_ORDERS;
