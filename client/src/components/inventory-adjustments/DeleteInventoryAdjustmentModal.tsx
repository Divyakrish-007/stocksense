import React, { useState } from 'react';
import type { InventoryAdjustment } from '../../types';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface DeleteInventoryAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: InventoryAdjustment | null;
  onConfirm: (id: number) => Promise<void>;
}

export const DeleteInventoryAdjustmentModal: React.FC<DeleteInventoryAdjustmentModalProps> = ({
  isOpen,
  onClose,
  adjustment,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !adjustment) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await onConfirm(adjustment.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete inventory adjustment. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-adj-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={!isDeleting ? onClose : undefined}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-slate-100">
          <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="delete-adj-title" className="text-base font-bold text-slate-900">
              Delete Inventory Adjustment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              This action is permanent and cannot be undone.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700">
            You are about to permanently delete adjustment{' '}
            <span className="font-bold font-mono text-slate-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              {adjustment.reference}
            </span>
            .
          </p>

          {/* Adjustment details */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Warehouse</span>
              <span className="font-semibold text-slate-900">
                {adjustment.warehouse_name || adjustment.warehouse_code}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Type</span>
              <span className="font-semibold text-slate-900">{adjustment.adjustment_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Reason</span>
              <span className="font-semibold text-slate-900 truncate max-w-[200px]">{adjustment.reason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Status</span>
              <span className="font-semibold text-slate-900">{adjustment.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Items</span>
              <span className="font-semibold text-slate-900">
                {adjustment.item_lines ?? adjustment.items?.length ?? 0} line{(adjustment.item_lines ?? adjustment.items?.length ?? 0) !== 1 ? 's' : ''},&nbsp;
                {adjustment.total_qty ?? adjustment.items?.reduce((s, i) => s + i.quantity, 0) ?? 0} units
              </span>
            </div>
          </div>

          {/* Warning */}
          <p className="text-xs text-slate-500">
            This adjustment and all its line items will be removed from the system.
          </p>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Adjustment</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
