import React from 'react';
import type { InventoryAdjustment } from '../../types';
import { InventoryAdjustmentStatusBadge } from './InventoryAdjustmentStatusBadge';
import { InventoryAdjustmentTypeBadge } from './InventoryAdjustmentTypeBadge';
import { Edit2, Trash2, Plus, Calendar, Layers, SlidersHorizontal, Lock } from 'lucide-react';

interface InventoryAdjustmentsTableProps {
  inventoryAdjustments: InventoryAdjustment[];
  isLoading: boolean;
  onEdit: (adjustment: InventoryAdjustment) => void;
  onDelete: (adjustment: InventoryAdjustment) => void;
  onAddNew: () => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export const InventoryAdjustmentsTable: React.FC<InventoryAdjustmentsTableProps> = ({
  inventoryAdjustments,
  isLoading,
  onEdit,
  onDelete,
  onAddNew,
  onResetFilters,
  isFiltered,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th scope="col" className="px-5 py-3">Reference</th>
              <th scope="col" className="px-4 py-3">Warehouse</th>
              <th scope="col" className="px-4 py-3">Adjustment Type</th>
              <th scope="col" className="px-4 py-3">Reason</th>
              <th scope="col" className="px-4 py-3">Items & Quantity</th>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-medium">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-36 bg-slate-200 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-40 bg-slate-200 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-5 w-20 bg-slate-200 rounded-full" /></td>
                  <td className="px-5 py-4 text-right"><div className="h-6 w-14 bg-slate-200 rounded ml-auto" /></td>
                </tr>
              ))
            ) : inventoryAdjustments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <SlidersHorizontal className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No inventory adjustments found</p>
                    <p className="text-xs text-slate-500 mt-1 text-center">
                      {isFiltered
                        ? 'No adjustments match your filter criteria. Try adjusting or clearing your filters.'
                        : 'No stock adjustments have been recorded yet. Create an adjustment to reconcile physical stock.'}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      {isFiltered && (
                        <button
                          onClick={onResetFilters}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                      <button
                        onClick={onAddNew}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Adjustment</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              inventoryAdjustments.map((adj) => {
                const isDone     = adj.status === 'Done';
                const isCanceled = adj.status === 'Canceled';
                const isLocked   = isDone || isCanceled;

                return (
                  <tr
                    key={adj.id}
                    className="hover:bg-slate-50/75 transition-colors group cursor-pointer"
                    onClick={() => onEdit(adj)}
                  >
                    {/* Reference */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">
                        {adj.reference}
                      </div>
                      {adj.notes && (
                        <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {adj.notes}
                        </p>
                      )}
                    </td>

                    {/* Warehouse */}
                    <td className="px-4 py-3.5">
                      <div className="text-slate-800 font-medium">
                        {adj.warehouse_name || adj.warehouse_code}
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {adj.warehouse_code}
                      </span>
                    </td>

                    {/* Adjustment Type */}
                    <td className="px-4 py-3.5">
                      <InventoryAdjustmentTypeBadge type={adj.adjustment_type} size="sm" />
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-3.5">
                      <span className="text-slate-700 font-medium line-clamp-1 max-w-[200px]" title={adj.reason}>
                        {adj.reason}
                      </span>
                    </td>

                    {/* Items & Quantity */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{adj.item_lines ?? adj.items?.length ?? 1} {adj.item_lines === 1 ? 'item' : 'items'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Total {adj.total_qty ?? 0} units
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{adj.created_at ? adj.created_at.split(' ')[0] : '—'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <InventoryAdjustmentStatusBadge status={adj.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td
                      className="px-5 py-3.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {isLocked ? (
                          <span
                            className="inline-flex items-center gap-1 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title={isDone ? 'Completed audit record (Read-Only)' : 'Canceled adjustment (Read-Only)'}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-normal">View</span>
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => onEdit(adj)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Edit adjustment"
                              aria-label="Edit adjustment"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDelete(adj)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete adjustment"
                              aria-label="Delete adjustment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
