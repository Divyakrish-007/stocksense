import React from 'react';
import type { SalesOrder } from '../../types';
import { SalesOrderStatusBadge } from './SalesOrderStatusBadge';
import { Edit2, Trash2, Eye, Building2, Calendar, ShoppingBag } from 'lucide-react';

interface SalesOrdersTableProps {
  salesOrders: SalesOrder[];
  loading: boolean;
  onEdit: (order: SalesOrder) => void;
  onDelete: (order: SalesOrder) => void;
  onView: (order: SalesOrder) => void;
}

export const SalesOrdersTable: React.FC<SalesOrdersTableProps> = ({
  salesOrders,
  loading,
  onEdit,
  onDelete,
  onView,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Loading sales orders data...</p>
      </div>
    );
  }

  if (salesOrders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">No sales orders found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No customer sales orders match your current filter criteria or search query.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Reference</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Warehouse</th>
              <th className="py-3 px-4">Order Date</th>
              <th className="py-3 px-4">Expected Date</th>
              <th className="py-3 px-4 text-center">Items</th>
              <th className="py-3 px-4 text-right">Quantity</th>
              <th className="py-3 px-4 text-right">Grand Total</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {salesOrders.map((order) => {
              const isDone = order.status === 'Done';

              return (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onView(order)}
                >
                  {/* Reference */}
                  <td className="py-3 px-4 font-mono font-bold text-blue-600 group-hover:text-blue-700 whitespace-nowrap">
                    {order.reference}
                  </td>

                  {/* Customer */}
                  <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                    {order.customer}
                  </td>

                  {/* Warehouse */}
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      {order.warehouse_code}
                    </span>
                  </td>

                  {/* Order Date */}
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {order.order_date}
                    </span>
                  </td>

                  {/* Expected Date */}
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {order.expected_date ? (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {order.expected_date}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">-</span>
                    )}
                  </td>

                  {/* Items Count */}
                  <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                    {order.item_lines ?? order.items?.length ?? 0}
                  </td>

                  {/* Quantity */}
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                    {order.total_qty ?? order.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0}
                  </td>

                  {/* Grand Total */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    ${Number(order.grand_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <SalesOrderStatusBadge status={order.status} size="sm" />
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1 justify-end">
                      <button
                        onClick={() => onView(order)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="View Order Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onEdit(order)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={isDone ? 'View Read-Only Order' : 'Edit Sales Order'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDelete(order)}
                        disabled={isDone}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDone
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title={isDone ? 'Completed order cannot be deleted' : 'Delete Sales Order'}
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
