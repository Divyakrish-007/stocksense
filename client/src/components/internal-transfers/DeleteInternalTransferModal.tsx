import React, { useState } from 'react';
import type { InternalTransfer } from '../../types';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface DeleteInternalTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: InternalTransfer | null;
  onConfirm: (id: number) => Promise<void>;
}

export const DeleteInternalTransferModal: React.FC<DeleteInternalTransferModalProps> = ({
  isOpen,
  onClose,
  transfer,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !transfer) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await onConfirm(transfer.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete internal transfer. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-it-title"
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
            <h2 id="delete-it-title" className="text-base font-bold text-slate-900">
              Delete Internal Transfer
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
            You are about to permanently delete transfer{' '}
            <span className="font-bold font-mono text-slate-900 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
              {transfer.reference}
            </span>
            .
          </p>

          {/* Transfer details */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Route</span>
              <span className="font-semibold text-slate-900">
                {transfer.source_warehouse_code} → {transfer.dest_warehouse_code}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Status</span>
              <span className="font-semibold text-slate-900">{transfer.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Items</span>
              <span className="font-semibold text-slate-900">
                {transfer.item_lines ?? transfer.items?.length ?? 0} line{(transfer.item_lines ?? transfer.items?.length ?? 0) !== 1 ? 's' : ''},&nbsp;
                {transfer.total_qty ?? transfer.items?.reduce((s, i) => s + i.quantity, 0) ?? 0} units
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Scheduled</span>
              <span className="font-semibold text-slate-900">{transfer.scheduled_date || 'N/A'}</span>
            </div>
          </div>

          {/* Warning note */}
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
            <span>
              Only transfers with <strong>Draft</strong>, <strong>Waiting</strong>, or <strong>Canceled</strong> status can be deleted.
              Transfers in <strong>Ready</strong> or <strong>Done</strong> status are protected.
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isDeleting ? 'Deleting…' : 'Yes, Delete Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
};
