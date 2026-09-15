import React from 'react';
import { ArrowLeft, Calculator } from 'lucide-react';
import { Order } from '../../types';

interface CommissionCalculationPageProps {
  orders: Order[];
  onBack: () => void;
}

// Reached only from the CB page: select one or more of a school's orders,
// then "Commission Calculation" in the bulk-action bar lands here with
// exactly those orders. Content to be added next.
export const CommissionCalculationPage: React.FC<CommissionCalculationPageProps> = ({ orders, onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="p-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center p-6 pt-16">
        <div className="w-full max-w-lg space-y-4">
          <div className="text-center space-y-1">
            <Calculator className="w-6 h-6 text-amber-400 mx-auto" />
            <h1 className="text-sm font-semibold text-slate-200">Commission Calculation</h1>
            <p className="text-xs text-slate-500">{orders.length} order{orders.length === 1 ? '' : 's'} selected</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
            {orders.map((o) => (
              <div key={o.orderId} className="px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">{o.orderId}</span>
                <span className="text-slate-300">{o.schoolName}</span>
                <span className="font-mono text-slate-400">₹{(o.orderValue || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
