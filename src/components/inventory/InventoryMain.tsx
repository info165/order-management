import React, { useState, useEffect } from 'react';
import {
  Material,
  Catalogue,
  Vendor,
  PurchaseOrder,
  StockMovement,
  Order,
  UserProfile
} from '../../types';
import {
  getMaterials,
  getCatalogues,
  getVendors,
  getPurchaseOrders,
  getStockMovements,
  subscribeToRealtimeMaterials,
  subscribeToRealtimeCatalogues,
  subscribeToRealtimeVendors,
  subscribeToRealtimePurchaseOrders,
  subscribeToRealtimeStockMovements
} from '../../services/dataService';
import { InventoryDashboard } from './InventoryDashboard';
import { MaterialMaster } from './MaterialMaster';
import { CatalogueBOMMaster } from './CatalogueBOMMaster';
import { VendorMaster } from './VendorMaster';
import { PurchaseOrderManager } from './PurchaseOrderManager';
import { ProcurementRequirementsView } from './ProcurementRequirementsView';
import { StockMovementLedger } from './StockMovementLedger';
import {
  Boxes,
  Package,
  Layers,
  Building2,
  FileText,
  AlertTriangle,
  History,
  RefreshCw
} from 'lucide-react';

interface Props {
  orders: Order[];
  currentUser?: UserProfile;
}

export const InventoryMain: React.FC<Props> = ({ orders, currentUser }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [materials, setMaterials] = useState<Material[]>([]);
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Cross-tab state handoffs
  const [preSelectedVendorId, setPreSelectedVendorId] = useState<string | undefined>();
  const [preSelectedMaterials, setPreSelectedMaterials] = useState<
    { materialId: string; requiredQty: number }[] | undefined
  >();

  // Fetch initial data & subscribe to real-time updates
  const loadData = async () => {
    try {
      const [mats, cats, vnds, pos, movs] = await Promise.all([
        getMaterials(),
        getCatalogues(),
        getVendors(),
        getPurchaseOrders(),
        getStockMovements()
      ]);
      setMaterials(mats);
      setCatalogues(cats);
      setVendors(vnds);
      setPurchaseOrders(pos);
      setStockMovements(movs);
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const unsubMats = subscribeToRealtimeMaterials(setMaterials);
    const unsubCats = subscribeToRealtimeCatalogues(setCatalogues);
    const unsubVnds = subscribeToRealtimeVendors(setVendors);
    const unsubPOs = subscribeToRealtimePurchaseOrders(setPurchaseOrders);
    const unsubMovs = subscribeToRealtimeStockMovements(setStockMovements);

    return () => {
      unsubMats();
      unsubCats();
      unsubVnds();
      unsubPOs();
      unsubMovs();
    };
  }, []);

  const handleLaunchPOWithMaterials = (
    vendorId: string,
    shortageItems: { materialId: string; requiredQty: number }[]
  ) => {
    setPreSelectedVendorId(vendorId);
    setPreSelectedMaterials(shortageItems);
    setActiveTab('purchase_orders');
  };

  const handleCreatePOFromVendor = (vendorId: string) => {
    setPreSelectedVendorId(vendorId);
    setPreSelectedMaterials(undefined);
    setActiveTab('purchase_orders');
  };

  const navItems = [
    { id: 'dashboard', label: 'Inventory Dashboard', icon: Boxes },
    { id: 'requirements', label: 'Procurement Requirements', icon: AlertTriangle },
    { id: 'purchase_orders', label: 'Purchase Orders (POs)', icon: FileText },
    { id: 'materials', label: 'Material Master', icon: Package },
    { id: 'bom', label: 'Catalogue / BOM Master', icon: Layers },
    { id: 'vendors', label: 'Vendor Master', icon: Building2 },
    { id: 'movements', label: 'Stock Movements (Ledger)', icon: History }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Sub-navigation bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="ml-auto pr-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Inventory"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Synchronizing inventory datasets...</span>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <InventoryDashboard
              materials={materials}
              catalogues={catalogues}
              vendors={vendors}
              purchaseOrders={purchaseOrders}
              stockMovements={stockMovements}
              orders={orders}
              currentUser={currentUser}
              onNavigateTab={setActiveTab}
              onRefresh={loadData}
              onLaunchPOWithMaterials={handleLaunchPOWithMaterials}
            />
          )}

          {activeTab === 'requirements' && (
            <ProcurementRequirementsView
              materials={materials}
              catalogues={catalogues}
              orders={orders}
              purchaseOrders={purchaseOrders}
              vendors={vendors}
              currentUser={currentUser}
              onLaunchPOWithMaterials={handleLaunchPOWithMaterials}
            />
          )}

          {activeTab === 'purchase_orders' && (
            <PurchaseOrderManager
              purchaseOrders={purchaseOrders}
              vendors={vendors}
              materials={materials}
              orders={orders}
              currentUser={currentUser}
              onRefresh={loadData}
              preSelectedVendorId={preSelectedVendorId}
              preSelectedMaterials={preSelectedMaterials}
            />
          )}

          {activeTab === 'materials' && (
            <MaterialMaster
              materials={materials}
              vendors={vendors}
              currentUser={currentUser}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'bom' && (
            <CatalogueBOMMaster
              catalogues={catalogues}
              materials={materials}
              currentUser={currentUser}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'vendors' && (
            <VendorMaster
              vendors={vendors}
              materials={materials}
              purchaseOrders={purchaseOrders}
              currentUser={currentUser}
              onRefresh={loadData}
              onCreatePOWithVendor={handleCreatePOFromVendor}
            />
          )}

          {activeTab === 'movements' && (
            <StockMovementLedger
              movements={stockMovements}
              currentUser={currentUser}
              onRefresh={loadData}
            />
          )}
        </>
      )}
    </div>
  );
};
