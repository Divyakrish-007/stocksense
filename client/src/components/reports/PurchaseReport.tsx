import React from 'react';
import type { PurchaseReport as PurchaseReportType } from '../../types';
import { ReportKpiCards } from './ReportKpiCards';
import { VerticalBarChart, HorizontalBarChart } from './ReportCharts';
import { ShoppingCart, CheckCircle2, Clock, DollarSign } from 'lucide-react';

interface PurchaseReportSectionProps {
  data: PurchaseReportType | null;
  isLoading: boolean;
}

export const PurchaseReportSection: React.FC<PurchaseReportSectionProps> = ({ data, isLoading }) => {
  const kpiCards = data
    ? [
        {
          label: 'Purchase Orders',
          value: data.purchaseOrderCount,
          subtext: 'Total POs in system',
          icon: <ShoppingCart className="w-4 h-4" />,
          color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        },
        {
          label: 'Completed',
          value: data.completedPurchaseOrders,
          subtext: 'POs marked as Done',
          icon: <CheckCircle2 className="w-4 h-4" />,
          color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        },
        {
          label: 'Pending',
          value: data.pendingPurchaseOrders,
          subtext: 'Draft / Waiting / Ready',
          icon: <Clock className="w-4 h-4" />,
          color: 'bg-amber-50 text-amber-600 border-amber-100',
        },
        {
          label: 'Total Value',
          value: `$${data.purchaseValue.toLocaleString()}`,
          subtext: 'Aggregate purchase value',
          icon: <DollarSign className="w-4 h-4" />,
          color: 'bg-blue-50 text-blue-600 border-blue-100',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-indigo-600" />
        <h2 className="text-base font-bold text-slate-800">Purchase Analytics</h2>
      </div>

      <ReportKpiCards cards={kpiCards} isLoading={isLoading} />

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Purchase Value */}
          <VerticalBarChart
            title="Monthly Purchase Value"
            data={data.purchaseByMonth.map((m) => ({
              label: m.month.substring(5),
              value: m.value,
            }))}
            color="bg-indigo-500"
          />

          {/* Purchase by Supplier */}
          <HorizontalBarChart
            title="Purchase Value by Supplier"
            items={data.topSuppliers.map((s) => ({
              label: s.supplier_name,
              value: s.total_value,
            }))}
            formatValue={(v) => `$${v.toLocaleString()}`}
          />

          {/* Recent Purchase Orders */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Recent Purchase Orders</h3>
            {data.recentPurchaseOrders.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No purchase orders found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 text-slate-500 font-semibold">Reference</th>
                      <th className="text-left py-2 text-slate-500 font-semibold">Supplier</th>
                      <th className="text-left py-2 text-slate-500 font-semibold">Date</th>
                      <th className="text-left py-2 text-slate-500 font-semibold">Warehouse</th>
                      <th className="text-right py-2 text-slate-500 font-semibold">Total</th>
                      <th className="text-center py-2 text-slate-500 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPurchaseOrders.map((po) => (
                      <tr key={po.id} className="border-b border-slate-50">
                        <td className="py-2 font-medium text-blue-600">{po.reference}</td>
                        <td className="py-2 text-slate-700">{po.supplier_name}</td>
                        <td className="py-2 text-slate-600">{po.order_date}</td>
                        <td className="py-2 text-slate-600">{po.warehouse_code}</td>
                        <td className="py-2 text-right font-medium text-slate-800">${po.grand_total.toLocaleString()}</td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            po.status === 'Done' ? 'bg-emerald-50 text-emerald-700' :
                            po.status === 'Canceled' ? 'bg-rose-50 text-rose-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>{po.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
