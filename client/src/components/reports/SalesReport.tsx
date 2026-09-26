import React from 'react';
import type { SalesReport as SalesReportType } from '../../types';
import { ReportKpiCards } from './ReportKpiCards';
import { VerticalBarChart, HorizontalBarChart } from './ReportCharts';
import { ShoppingBag, CheckCircle2, Clock, DollarSign } from 'lucide-react';

interface SalesReportSectionProps {
  data: SalesReportType | null;
  isLoading: boolean;
}

export const SalesReportSection: React.FC<SalesReportSectionProps> = ({ data, isLoading }) => {
  const kpiCards = data
    ? [
        {
          label: 'Sales Orders',
          value: data.salesOrderCount,
          subtext: 'Total SOs in system',
          icon: <ShoppingBag className="w-4 h-4" />,
          color: 'bg-violet-50 text-violet-600 border-violet-100',
        },
        {
          label: 'Completed',
          value: data.completedSalesOrders,
          subtext: 'SOs marked as Done',
          icon: <CheckCircle2 className="w-4 h-4" />,
          color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        },
        {
          label: 'Pending',
          value: data.pendingSalesOrders,
          subtext: 'Draft / Waiting / Ready',
          icon: <Clock className="w-4 h-4" />,
          color: 'bg-amber-50 text-amber-600 border-amber-100',
        },
        {
          label: 'Total Revenue',
          value: `$${data.totalSalesValue.toLocaleString()}`,
          subtext: 'Aggregate sales value',
          icon: <DollarSign className="w-4 h-4" />,
          color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-violet-600" />
        <h2 className="text-base font-bold text-slate-800">Sales Analytics</h2>
      </div>

      <ReportKpiCards cards={kpiCards} isLoading={isLoading} />

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Sales Value */}
          <VerticalBarChart
            title="Monthly Sales Value"
            data={data.salesByMonth.map((m) => ({
              label: m.month.substring(5),
              value: m.value,
            }))}
            color="bg-violet-500"
          />

          {/* Sales by Customer */}
          <HorizontalBarChart
            title="Sales Value by Customer"
            items={data.topCustomers.map((c) => ({
              label: c.customer_name,
              value: c.total_value,
            }))}
            formatValue={(v) => `$${v.toLocaleString()}`}
          />

          {/* Recent Sales Orders */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Recent Sales Orders</h3>
            {data.recentSalesOrders.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No sales orders found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 text-slate-500 font-semibold">Reference</th>
                      <th className="text-left py-2 text-slate-500 font-semibold">Customer</th>
                      <th className="text-left py-2 text-slate-500 font-semibold">Date</th>
                      <th className="text-left py-2 text-slate-500 font-semibold">Warehouse</th>
                      <th className="text-right py-2 text-slate-500 font-semibold">Total</th>
                      <th className="text-center py-2 text-slate-500 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSalesOrders.map((so) => (
                      <tr key={so.id} className="border-b border-slate-50">
                        <td className="py-2 font-medium text-blue-600">{so.reference}</td>
                        <td className="py-2 text-slate-700">{so.customer}</td>
                        <td className="py-2 text-slate-600">{so.order_date}</td>
                        <td className="py-2 text-slate-600">{so.warehouse_code}</td>
                        <td className="py-2 text-right font-medium text-slate-800">${so.grand_total.toLocaleString()}</td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            so.status === 'Done' ? 'bg-emerald-50 text-emerald-700' :
                            so.status === 'Canceled' ? 'bg-rose-50 text-rose-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>{so.status}</span>
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
