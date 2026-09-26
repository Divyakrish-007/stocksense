import React from 'react';
import type { InternalTransfer } from '../../types';
import { InternalTransferStatusBadge } from './InternalTransferStatusBadge';
import { Edit2, Trash2, Plus, Calendar, Layers, ArrowRight } from 'lucide-react';

interface InternalTransfersTableProps {
  internalTransfers: InternalTransfer[];
  isLoading: boolean;
  onEdit: (transfer: InternalTransfer) => void;
  onDelete: (transfer: InternalTransfer) => void;
  onAddNew: () => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export const InternalTransfersTable: React.FC<InternalTransfersTableProps> = ({
  internalTransfers,
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
              <th scope="col" className="px-4 py-3">Route (From → To)</th>
              <th scope="col" className="px-4 py-3">Items & Quantity</th>
              <th scope="col" className="px-4 py-3">Scheduled Date</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Notes</th>
              <th scope="col" className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-medium">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-48 bg-slate-200 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-5 w-20 bg-slate-200 rounded-full" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
                  <td className="px-5 py-4 text-right"><div className="h-6 w-14 bg-slate-200 rounded ml-auto" /></td>
                </tr>
              ))
            ) : internalTransfers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <ArrowRight className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No internal transfers found</p>
                    <p className="text-xs text-slate-500 mt-1 text-center">
                      {isFiltered
                        ? 'No transfers match your filter criteria. Try adjusting or clearing your filters.'
                        : 'No inter-facility transfers have been created yet. Create one to move stock between warehouses.'}
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Transfer</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              internalTransfers.map((t) => {
                const isDone     = t.status === 'Done';
                const isCanceled = t.status === 'Canceled';
                const isLocked   = isDone || isCanceled;

                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Reference */}
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-violet-50 border border-violet-200 text-violet-800">
                        {t.reference}
                      </span>
                    </td>

                    {/* Route */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="text-xs">
                          <span className="font-semibold text-slate-900">{t.source_warehouse_code}</span>
                          {t.source_warehouse_name && (
                            <span className="text-[11px] text-slate-400 ml-1 hidden xl:inline">
                              ({t.source_warehouse_name})
                            </span>
                          )}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-900">{t.dest_warehouse_code}</span>
                          {t.dest_warehouse_name && (
                            <span className="text-[11px] text-slate-400 ml-1 hidden xl:inline">
                              ({t.dest_warehouse_name})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Items & Quantity */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">
                          {t.item_lines ?? (t.items?.length ?? 0)} {(t.item_lines === 1 || t.items?.length === 1) ? 'item' : 'items'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {t.total_qty ?? (t.items?.reduce((s, i) => s + i.quantity, 0) ?? 0)} units
                        </span>
                      </div>
                    </td>

                    {/* Scheduled Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{t.scheduled_date || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <InternalTransferStatusBadge status={t.status} size="sm" />
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3.5 max-w-[160px]">
                      {t.notes ? (
                        <span className="text-[11px] text-slate-400 truncate block" title={t.notes}>
                          {t.notes}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(t)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors cursor-pointer"
                          title={isDone ? 'View completed transfer' : isCanceled ? 'View canceled transfer' : 'Edit transfer'}
                          aria-label={`Edit ${t.reference}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDelete(t)}
                          disabled={isLocked}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isLocked
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                          }`}
                          title={
                            isDone
                              ? 'Completed transfers cannot be deleted — stock already moved'
                              : isCanceled
                              ? 'Canceled transfers cannot be deleted'
                              : 'Delete transfer'
                          }
                          aria-label={`Delete ${t.reference}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
        <span>Showing {internalTransfers.length} internal transfer{internalTransfers.length !== 1 ? 's' : ''} in current view</span>
        <span className="text-[11px] text-slate-600">
          Stock is relocated between warehouses upon transition to <strong>Done</strong>
        </span>
      </div>
    </div>
  );
};
