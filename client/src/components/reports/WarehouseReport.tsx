import React from 'react';
import type { WarehouseReport as WarehouseReportType } from '../../types';
import { HorizontalBarChart } from './ReportCharts';
import { Warehouse } from 'lucide-react';

interface WarehouseReportSectionProps {
  data: WarehouseReportType | null;
  isLoading: boolean;
}

export const WarehouseReportSection: React.FC<WarehouseReportSectionProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-cyan-600" />
          <h2 className="text-base font-bold text-slate-800">Warehouse Analytics</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm animate-pulse h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Warehouse className="w-5 h-5 text-cyan-600" />
        <h2 className="text-base font-bold text-slate-800">Warehouse Analytics</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warehouse Inventory Comparison */}
        <HorizontalBarChart
          title="Warehouse Stock Comparison"
          items={data.warehouseActivitySummary.map((w) => ({
            label: w.warehouse_name || w.warehouse_code,
            value: w.total_stock,
          }))}
          formatValue={(v) => `${v.toLocaleString()} units`}
        />

        {/* Warehouse Value */}
        <HorizontalBarChart
          title="Warehouse Inventory Value"
          items={data.warehouseActivitySummary.map((w) => ({
            label: w.warehouse_name || w.warehouse_code,
            value: w.inventory_value,
          }))}
          formatValue={(v) => `$${v.toLocaleString()}`}
        />

        {/* Full Activity Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Warehouse Activity Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-slate-500 font-semibold">Warehouse</th>
                  <th className="text-left py-2 text-slate-500 font-semibold">Location</th>
                  <th className="text-right py-2 text-slate-500 font-semibold">Products</th>
                  <th className="text-right py-2 text-slate-500 font-semibold">Stock</th>
                  <th className="text-right py-2 text-slate-500 font-semibold">Value</th>
                  <th className="text-right py-2 text-slate-500 font-semibold">Inbound</th>
                  <th className="text-right py-2 text-slate-500 font-semibold">Outbound</th>
                  <th className="text-right py-2 text-slate-500 font-semibold">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {data.warehouseActivitySummary.map((wh) => (
                  <tr key={wh.warehouse_code} className="border-b border-slate-50">
                    <td className="py-2.5 font-medium text-slate-700">{wh.warehouse_name}</td>
                    <td className="py-2.5 text-slate-600">{wh.location}</td>
                    <td className="py-2.5 text-right text-slate-600">{wh.product_count}</td>
                    <td className="py-2.5 text-right text-slate-600">{wh.total_stock.toLocaleString()}</td>
                    <td className="py-2.5 text-right font-medium text-slate-800">${wh.inventory_value.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-emerald-600 font-medium">{wh.total_inbound.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-blue-600 font-medium">{wh.total_outbound.toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              wh.utilization > 80 ? 'bg-rose-500' :
                              wh.utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(wh.utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-slate-600 font-medium">{wh.utilization}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
