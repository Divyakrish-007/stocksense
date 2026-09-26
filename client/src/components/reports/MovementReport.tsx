import React from 'react';
import type { MovementReport as MovementReportType } from '../../types';
import { ReportKpiCards } from './ReportKpiCards';
import { ComparisonBar, VerticalBarChart } from './ReportCharts';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, SlidersHorizontal, TrendingUp } from 'lucide-react';

interface MovementReportSectionProps {
  data: MovementReportType | null;
  isLoading: boolean;
}

export const MovementReportSection: React.FC<MovementReportSectionProps> = ({ data, isLoading }) => {
  const kpiCards = data
    ? [
        {
          label: 'Receipts',
          value: data.receipts.count,
          subtext: `${data.receipts.totalQuantity.toLocaleString()} units received`,
          icon: <ArrowDownLeft className="w-4 h-4" />,
          color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        },
        {
          label: 'Deliveries',
          value: data.deliveries.count,
          subtext: `${data.deliveries.totalQuantity.toLocaleString()} units dispatched`,
          icon: <ArrowUpRight className="w-4 h-4" />,
          color: 'bg-blue-50 text-blue-600 border-blue-100',
        },
        {
          label: 'Transfers',
          value: data.internalTransfers.count,
          subtext: `${data.internalTransfers.totalQuantity.toLocaleString()} units moved`,
          icon: <ArrowLeftRight className="w-4 h-4" />,
          color: 'bg-violet-50 text-violet-600 border-violet-100',
        },
        {
          label: 'Adjustments',
          value: data.adjustments.count,
          subtext: `+${data.adjustments.increaseQuantity.toLocaleString()} / -${data.adjustments.decreaseQuantity.toLocaleString()}`,
          icon: <SlidersHorizontal className="w-4 h-4" />,
          color: 'bg-amber-50 text-amber-600 border-amber-100',
        },
        {
          label: 'Net Movement',
          value: data.netInventoryMovement >= 0
            ? `+${data.netInventoryMovement.toLocaleString()}`
            : data.netInventoryMovement.toLocaleString(),
          subtext: data.netInventoryMovement >= 0 ? 'Net inbound surplus' : 'Net outbound deficit',
          icon: <TrendingUp className="w-4 h-4" />,
          color: data.netInventoryMovement >= 0
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
            : 'bg-rose-50 text-rose-600 border-rose-100',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-emerald-600" />
        <h2 className="text-base font-bold text-slate-800">Movement Analytics</h2>
      </div>

      <ReportKpiCards cards={kpiCards} isLoading={isLoading} />

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inbound vs Outbound */}
          <ComparisonBar
            title="Inbound vs Outbound Quantity"
            leftLabel="Total Inbound"
            leftValue={data.totalInboundQuantity}
            leftColor="bg-emerald-500"
            rightLabel="Total Outbound"
            rightValue={data.totalOutboundQuantity}
            rightColor="bg-blue-500"
            formatValue={(v) => `${v.toLocaleString()} units`}
          />

          {/* Movement Trend */}
          {data.movementTrends.length > 0 && (
            <VerticalBarChart
              title="Monthly Movement Activity (Done)"
              data={data.movementTrends.map((m) => ({
                label: m.month.substring(5),
                value: m.receipts + m.deliveries + m.transfers + m.adjustments,
              }))}
              color="bg-cyan-500"
              formatValue={(v) => `${v} ops`}
            />
          )}

          {/* Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Movement Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-slate-500 font-semibold">Type</th>
                    <th className="text-right py-2 text-slate-500 font-semibold">Operations</th>
                    <th className="text-right py-2 text-slate-500 font-semibold">Total Quantity</th>
                    <th className="text-right py-2 text-slate-500 font-semibold">Direction</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-50">
                    <td className="py-2.5 font-medium text-slate-700 flex items-center gap-2">
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" /> Receipts
                    </td>
                    <td className="py-2.5 text-right text-slate-600">{data.receipts.count}</td>
                    <td className="py-2.5 text-right text-slate-600">{data.receipts.totalQuantity.toLocaleString()}</td>
                    <td className="py-2.5 text-right"><span className="text-emerald-600 font-semibold">Inbound</span></td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2.5 font-medium text-slate-700 flex items-center gap-2">
                      <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" /> Deliveries
                    </td>
                    <td className="py-2.5 text-right text-slate-600">{data.deliveries.count}</td>
                    <td className="py-2.5 text-right text-slate-600">{data.deliveries.totalQuantity.toLocaleString()}</td>
                    <td className="py-2.5 text-right"><span className="text-blue-600 font-semibold">Outbound</span></td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2.5 font-medium text-slate-700 flex items-center gap-2">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-violet-500" /> Internal Transfers
                    </td>
                    <td className="py-2.5 text-right text-slate-600">{data.internalTransfers.count}</td>
                    <td className="py-2.5 text-right text-slate-600">{data.internalTransfers.totalQuantity.toLocaleString()}</td>
                    <td className="py-2.5 text-right"><span className="text-violet-600 font-semibold">Internal</span></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-slate-700 flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" /> Adjustments
                    </td>
                    <td className="py-2.5 text-right text-slate-600">{data.adjustments.count}</td>
                    <td className="py-2.5 text-right text-slate-600">
                      +{data.adjustments.increaseQuantity.toLocaleString()} / -{data.adjustments.decreaseQuantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right"><span className="text-amber-600 font-semibold">Mixed</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
