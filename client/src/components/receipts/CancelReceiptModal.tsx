import React, { useState } from 'react';
import type { Receipt } from '../../types';
import { Modal } from '../common/Modal';
import { ReceiptStatusBadge } from './ReceiptStatusBadge';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface CancelReceiptModalProps {
  receipt: Receipt | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
}

export const CancelReceiptModal: React.FC<CancelReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!receipt) return null;

  const isDone = receipt.status === 'Done';

  const handleDelete = async () => {
    if (isDone) return;
    setIsDeleting(true);
    setError('');
    try {
      await onConfirm(receipt.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel/delete receipt.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel / Delete Inbound Receipt"
      subtitle="Remove receipt record from StockSense inventory schedule"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Warning Icon & Message */}
        {isDone ? (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-semibold">Completed Receipts Cannot Be Deleted</p>
              <p className="text-amber-700">
                This receipt has already been marked as <strong>Done</strong>. Product inventory quantities have already been credited to warehouse stock.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 space-y-1">
              <p className="font-semibold">Are you sure you want to cancel / delete this receipt?</p>
              <p className="text-rose-700">
                This will remove the inbound shipment reference <strong>{receipt.reference}</strong> and all associated line items from the database.
              </p>
            </div>
          </div>
        )}

        {/* Receipt Details Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Reference:</span>
            <span className="font-mono font-bold text-slate-900">{receipt.reference}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Vendor / Partner:</span>
            <span className="font-semibold text-slate-800">{receipt.vendor}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Warehouse Facility:</span>
            <span className="text-slate-700">{receipt.warehouse_code} {receipt.warehouse_name ? `(${receipt.warehouse_name})` : ''}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Scheduled Date:</span>
            <span className="text-slate-700">{receipt.scheduled_date || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Items & Total Quantity:</span>
            <span className="font-mono font-bold text-slate-900">
              {receipt.item_lines ?? receipt.items?.length ?? 0} items ({receipt.total_qty ?? 0} units)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Current Status:</span>
            <ReceiptStatusBadge status={receipt.status} size="sm" />
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            {error}
          </p>
        )}

        {/* Modal Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {isDone ? 'Close' : 'Keep Receipt'}
          </button>

          {!isDone && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Canceling...</span>
                </>
              ) : (
                <span>Confirm Cancel</span>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
