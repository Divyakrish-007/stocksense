import React from 'react';
import type { Receipt } from '../../types';
import { ReceiptStatusBadge } from './ReceiptStatusBadge';
import { Edit2, Trash2, Warehouse as WarehouseIcon, Plus, Calendar, PackageCheck, Layers } from 'lucide-react';

interface ReceiptsTableProps {
  receipts: Receipt[];
  isLoading: boolean;
  onEdit: (receipt: Receipt) => void;
  onCancel: (receipt: Receipt) => void;
  onAddNew: () => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export const ReceiptsTable: React.FC<ReceiptsTableProps> = ({
  receipts,
  isLoading,
  onEdit,
  onCancel,
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
              <th scope="col" className="px-5 py-3">Receipt / Ref</th>
              <th scope="col" className="px-4 py-3">Vendor / Partner</th>
              <th scope="col" className="px-4 py-3">Destination Facility</th>
              <th scope="col" className="px-4 py-3">Items & Quantity</th>
              <th scope="col" className="px-4 py-3">Scheduled Date</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-medium">
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 w-28 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-36 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-28 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-5 w-20 bg-slate-200 rounded-full"></div></td>
                  <td className="px-5 py-4 text-right"><div className="h-6 w-14 bg-slate-200 rounded ml-auto"></div></td>
                </tr>
              ))
            ) : receipts.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <PackageCheck className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No inbound receipts found</p>
                    <p className="text-xs text-slate-500 mt-1 text-center">
                      {isFiltered
                        ? 'No receipts match your selected filter criteria. Try adjusting or clearing your filters.'
                        : 'No receipts have been registered yet. Create your first inbound receipt to schedule incoming inventory.'}
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Receipt</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              // Receipt Rows
              receipts.map((r) => {
                const isDone = r.status === 'Done';
                const isCanceled = r.status === 'Canceled';

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Reference */}
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                        {r.reference}
                      </span>
                    </td>

                    {/* Vendor */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 text-xs">{r.vendor}</div>
                      {r.notes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5" title={r.notes}>
                          {r.notes}
                        </div>
                      )}
                    </td>

                    {/* Destination Warehouse */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <WarehouseIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{r.warehouse_code}</span>
                        {r.warehouse_name && (
                          <span className="text-[11px] text-slate-500 hidden xl:inline truncate max-w-[130px]">
                            • {r.warehouse_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Items & Quantity */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">
                          {r.item_lines || (r.items ? r.items.length : 0)} {(r.item_lines === 1 || (r.items && r.items.length === 1)) ? 'item' : 'items'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {r.total_qty ?? (r.items ? r.items.reduce((s, it) => s + it.quantity, 0) : 0)} units
                        </span>
                      </div>
                    </td>

                    {/* Scheduled Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{r.scheduled_date || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <ReceiptStatusBadge status={r.status} size="sm" />
                    </td>

                    {/* Actions: Edit & Cancel */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title={isDone ? "View Completed Receipt" : isCanceled ? "View Canceled Receipt" : "Edit Receipt"}
                          aria-label={`Edit ${r.reference}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onCancel(r)}
                          disabled={isDone}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDone
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                          }`}
                          title={isDone ? "Completed receipts cannot be canceled (stock already received)" : "Cancel / Delete Receipt"}
                          aria-label={`Cancel ${r.reference}`}
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
        <span>Showing {receipts.length} receipts in current view</span>
        <span className="text-[11px] text-slate-600">
          Stock levels automatically sync upon transition to <strong>Done</strong>
        </span>
      </div>
    </div>
  );
};
