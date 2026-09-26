import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { salesOrdersApi } from '../../api/salesOrders';
import type { SalesOrder } from '../../types';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface DeleteSalesOrderModalProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  salesOrder: SalesOrder | null;
}

export const DeleteSalesOrderModal: React.FC<DeleteSalesOrderModalProps> = ({
  open,
  onClose,
  onDeleted,
  salesOrder,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!salesOrder) return null;

  const isDone = salesOrder.status === 'Done';

  const handleDelete = async () => {
    if (isDone) {
      setError('Completed sales orders cannot be deleted because inventory stock has already been dispatched');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await salesOrdersApi.deleteSalesOrder(salesOrder.id);
      showToast('success', 'Sales Order Deleted', `Deleted order ${salesOrder.reference}`);
      onDeleted();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to delete sales order');
      showToast('error', 'Error', err?.message || 'Failed to delete sales order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Delete Sales Order: ${salesOrder.reference}`}
      subtitle="Confirm cancellation and permanent deletion of customer order record"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-slate-500 font-medium">Order Reference:</span>
            <span className="font-mono font-bold text-blue-600">{salesOrder.reference}</span>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-slate-500 font-medium">Customer:</span>
            <span className="font-semibold text-slate-900">{salesOrder.customer}</span>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-slate-500 font-medium">Warehouse Facility:</span>
            <span className="font-mono font-medium text-slate-800">{salesOrder.warehouse_code}</span>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-slate-500 font-medium">Order Grand Total:</span>
            <span className="font-mono font-bold text-slate-900">
              ${Number(salesOrder.grand_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-700 border-t border-slate-200 pt-2">
            <span className="text-slate-500 font-medium">Current Status:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'}`}>
              {salesOrder.status}
            </span>
          </div>
        </div>

        {isDone ? (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg flex items-start gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>Action Restricted:</strong> Completed orders in <strong>Done</strong> status cannot be deleted because stock deduction has already been posted to inventory accounts.
            </div>
          </div>
        ) : (
          <p className="text-slate-600">
            Are you sure you want to delete this sales order? This action will remove the record and any associated line item references permanently.
          </p>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {!isDone && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-rose-600/20 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Sales Order</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
