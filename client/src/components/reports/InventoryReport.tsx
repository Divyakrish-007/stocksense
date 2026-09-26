import React from 'react';
import type { InventoryReport as InventoryReportType } from '../../types';
import { ReportKpiCards } from './ReportKpiCards';
import { HorizontalBarChart, DonutChart } from './ReportCharts';
import { Package, Boxes, AlertTriangle, XCircle, DollarSign } from 'lucide-react';

interface InventoryReportSectionProps {
  data: InventoryReportType | null;
  isLoading: boolean;
}

export const InventoryReportSection: React.FC<InventoryReportSectionProps> = ({ data, isLoading }) => {
  const kpiCards = data
    ? [
        {
          label: 'Total Stock',
          value: data.totalStockQuantity.toLocaleString(),
          subtext: 'Total units across all warehouses',
          icon: <Boxes className="w-4 h-4" />,
          color: 'bg-blue-50 text-blue-600 border-blue-100',
        },
        {
          label: 'Inventory Value',
          value: `$${data.inventoryValue.toLocaleString()}`,
          subtext: 'Total valuation at cost',
          icon: <DollarSign className="w-4 h-4" />,
          color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        },
        {
          label: 'In Stock',
          value: data.inStockCount,
          subtext: 'Products with healthy levels',
          icon: <Package className="w-4 h-4" />,
          color: 'bg-sky-50 text-sky-600 border-sky-100',
        },
        {
          label: 'Low Stock',
          value: data.lowStockCount,
          subtext: 'Products below minimum threshold',
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'bg-amber-50 text-amber-600 border-amber-100',
        },
        {
          label: 'Out of Stock',
          value: data.outOfStockCount,
          subtext: 'Products with zero inventory',
          icon: <XCircle className="w-4 h-4" />,
          color: 'bg-rose-50 text-rose-600 border-rose-100',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="w-5 h-5 text-blue-600" />
        <h2 className="text-base font-bold text-slate-800">Inventory Analysis</h2>
      </div>

      <ReportKpiCards cards={kpiCards} isLoading={isLoading} />

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock by Warehouse */}
          <HorizontalBarChart
            title="Stock by Warehouse"
            items={data.stockByWarehouse.map((w) => ({
              label: w.warehouse_name || w.warehouse_code,
              value: w.total_stock,
            }))}
            formatValue={(v) => `${v.toLocaleString()} units`}
          />

          {/* Stock by Category */}
          <HorizontalBarChart
            title="Stock by Category"
            items={data.stockByCategory.map((c) => ({
              label: c.category,
              value: c.total_stock,
            }))}
            formatValue={(v) => `${v.toLocaleString()} units`}
          />

          {/* Stock Status Distribution */}
          <DonutChart
            title="Stock Status Distribution"
            items={[
              { label: 'In Stock', value: data.inStockCount, color: '#22c55e' },
              { label: 'Low Stock', value: data.lowStockCount, color: '#f59e0b' },
              { label: 'Out of Stock', value: data.outOfStockCount, color: '#ef4444' },
            ]}
            centerValue={data.inStockCount + data.lowStockCount + data.outOfStockCount}
            centerLabel="Products"
          />

          {/* Top Stocked Products */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Top Stocked Products</h3>
            {data.topStockedProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No products found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 text-slate-500 font-semibold">Product</th>
                      <th className="text-right py-2 text-slate-500 font-semibold">Quantity</th>
                      <th className="text-right py-2 text-slate-500 font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topStockedProducts.slice(0, 8).map((p) => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="py-2 font-medium text-slate-700">{p.name}</td>
                        <td className="py-2 text-right text-slate-600">{p.quantity.toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-600">
                          ${(p.quantity * p.unit_price).toLocaleString()}
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
