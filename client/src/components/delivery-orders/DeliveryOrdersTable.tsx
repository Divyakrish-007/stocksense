import React from 'react';
import type { DeliveryOrder } from '../../types';
import { DeliveryOrderStatusBadge } from './DeliveryOrderStatusBadge';
import { Edit2, Trash2, Warehouse as WarehouseIcon, Plus, Calendar, Truck, Layers, MapPin } from 'lucide-react';

interface DeliveryOrdersTableProps {
  deliveryOrders: DeliveryOrder[];
  isLoading: boolean;
  onEdit: (order: DeliveryOrder) => void;
  onCancel: (order: DeliveryOrder) => void;
  onAddNew: () => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export const DeliveryOrdersTable: React.FC<DeliveryOrdersTableProps> = ({
  deliveryOrders,
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
              <th scope="col" className="px-5 py-3">Order / Ref</th>
              <th scope="col" className="px-4 py-3">Customer / Partner</th>
              <th scope="col" className="px-4 py-3">Source Facility</th>
              <th scope="col" className="px-4 py-3">Destination Address</th>
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
                  <td className="px-4 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-5 w-20 bg-slate-200 rounded-full"></div></td>
                  <td className="px-5 py-4 text-right"><div className="h-6 w-14 bg-slate-200 rounded ml-auto"></div></td>
                </tr>
              ))
            ) : deliveryOrders.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <Truck className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No outbound delivery orders found</p>
                    <p className="text-xs text-slate-500 mt-1 text-center">
                      {isFiltered
                        ? 'No delivery orders match your selected filter criteria. Try adjusting or clearing your filters.'
                        : 'No delivery orders have been created yet. Generate an outbound dispatch order to schedule customer shipments.'}
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
                        <span>Create Delivery Order</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              // Delivery Order Rows
              deliveryOrders.map((d) => {
                const isDone = d.status === 'Done';
                const isCanceled = d.status === 'Canceled';

                return (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Reference */}
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                        {d.reference}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 text-xs">{d.customer}</div>
                      {d.notes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5" title={d.notes}>
                          {d.notes}
                        </div>
                      )}
                    </td>

                    {/* Source Warehouse */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <WarehouseIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{d.warehouse_code}</span>
                        {d.warehouse_name && (
                          <span className="text-[11px] text-slate-500 hidden xl:inline truncate max-w-[120px]">
                            • {d.warehouse_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Destination Address */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-slate-700 text-xs" title={d.destination_address}>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{d.destination_address}</span>
                      </div>
                    </td>

                    {/* Items & Quantity */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">
                          {d.item_lines || (d.items ? d.items.length : 0)} {(d.item_lines === 1 || (d.items && d.items.length === 1)) ? 'item' : 'items'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {d.total_qty ?? (d.items ? d.items.reduce((s, it) => s + it.quantity, 0) : 0)} units
                        </span>
                      </div>
                    </td>

                    {/* Scheduled Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{d.scheduled_date || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <DeliveryOrderStatusBadge status={d.status} size="sm" />
                    </td>

                    {/* Actions: Edit & Cancel */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(d)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title={isDone ? "View Dispatched Order" : isCanceled ? "View Canceled Order" : "Edit Delivery Order"}
                          aria-label={`Edit ${d.reference}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onCancel(d)}
                          disabled={isDone}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDone
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                          }`}
                          title={isDone ? "Dispatched orders cannot be deleted (stock already deducted)" : "Cancel / Delete Delivery Order"}
                          aria-label={`Cancel ${d.reference}`}
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
        <span>Showing {deliveryOrders.length} delivery orders in current view</span>
        <span className="text-[11px] text-slate-600">
          Stock levels automatically deducted upon transition to <strong>Done</strong>
        </span>
      </div>
    </div>
  );
};
