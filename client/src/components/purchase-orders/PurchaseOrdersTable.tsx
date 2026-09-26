import React from 'react';
import type { PurchaseOrder } from '../../types';
import { PurchaseOrderStatusBadge } from './PurchaseOrderStatusBadge';
import { Edit2, Trash2, ShoppingCart, Calendar, Building2, Warehouse, DollarSign, Package } from 'lucide-react';

interface PurchaseOrdersTableProps {
  purchaseOrders: PurchaseOrder[];
  isLoading: boolean;
  onEdit: (po: PurchaseOrder) => void;
  onDelete: (po: PurchaseOrder) => void;
  onAddClick: () => void;
}

export const PurchaseOrdersTable: React.FC<PurchaseOrdersTableProps> = ({
  purchaseOrders,
  isLoading,
  onEdit,
  onDelete,
  onAddClick,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-100 rounded-lg w-full" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-lg w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (purchaseOrders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <ShoppingCart className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">No Purchase Orders Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
          No procurement orders match your current filter selection or none have been created yet.
        </p>
        <button
          onClick={onAddClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
        >
          <span>Create Purchase Order</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">PO Reference</th>
              <th className="py-3 px-4">Supplier Vendor</th>
              <th className="py-3 px-4">Destination Warehouse</th>
              <th className="py-3 px-4">Dates (Ordered / Due)</th>
              <th className="py-3 px-4 text-center">Products & Qty</th>
              <th className="py-3 px-4 text-right">Grand Total</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {purchaseOrders.map((po) => {
              const isFinalized = ['Done', 'Received'].includes(po.status);

              return (
                <tr key={po.id} className="hover:bg-slate-50/70 transition-colors group">
                  {/* PO Reference */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {po.reference}
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {po.payment_terms || 'Net 30'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Supplier */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{po.supplier_name || 'N/A'}</span>
                    </div>
                    {po.supplier_code && (
                      <span className="text-[10px] font-mono text-slate-400 pl-5">
                        {po.supplier_code}
                      </span>
                    )}
                  </td>

                  {/* Destination Warehouse */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <Warehouse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono font-semibold">{po.warehouse_code}</span>
                    </div>
                    {po.warehouse_name && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[140px] block pl-5">
                        {po.warehouse_name}
                      </span>
                    )}
                  </td>

                  {/* Dates */}
                  <td className="py-3.5 px-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px]">{po.order_date || 'N/A'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono pl-5">
                      Due: {po.expected_date || 'N/A'}
                    </div>
                  </td>

                  {/* Products & Qty */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800 text-xs">
                        <Package className="w-3.5 h-3.5 text-blue-500" />
                        {po.item_lines || (po.items ? po.items.length : 0)} line items
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {(po.total_qty || 0).toLocaleString()} total units
                      </span>
                    </div>
                  </td>

                  {/* Grand Total */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-0.5 font-mono font-bold text-slate-900 text-sm">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      {(po.grand_total || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <PurchaseOrderStatusBadge status={po.status} />
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(po)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title={isFinalized ? 'View Purchase Order' : 'Edit Purchase Order'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(po)}
                        disabled={isFinalized}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                        title={isFinalized ? 'Completed PO cannot be deleted' : 'Delete Purchase Order'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
