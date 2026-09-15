import React from 'react';
import { ArrowLeft, Calculator } from 'lucide-react';
import { Order } from '../../types';
import { CurrencyFormatter } from '../common/CurrencyFormatter';

interface CommissionCalculationPageProps {
  orders: Order[];
  onBack: () => void;
}

// Reached only from the CB page: select one or more of a school's orders,
// then "Commission Calculation" in the bulk-action bar lands here with
// exactly those orders.
//
// order.orderValue is each order's GST-inclusive total (the same field
// NewOrderModal computes /1.18 against to get the taxable value at creation
// time - see its `taxableValue` comment), so summing it across the selected
// orders and dividing by 1.18 the same way gives the combined pre-GST
// amount, per the exact formula requested: (order 1 + order 2) / 1.18.
export const CommissionCalculationPage: React.FC<CommissionCalculationPageProps> = ({ orders, onBack }) => {
  const totalOrderValue = orders.reduce((sum, o) => sum + (o.orderValue || 0), 0);
  const calculatedAmount = totalOrderValue / 1.18;

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

      <div className="flex-1 flex items-start justify-center p-6 pt-12">
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
                <span className="text-slate-300 truncate mx-3">{o.schoolName}</span>
                <CurrencyFormatter amount={o.orderValue || 0} className="text-slate-200 shrink-0" />
              </div>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Order Value</span>
              <CurrencyFormatter amount={totalOrderValue} className="text-slate-200" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>÷ 1.18</span>
            </div>
            <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">Amount</span>
              <CurrencyFormatter amount={calculatedAmount} showDecimals className="text-lg font-bold text-amber-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
