import React, { useState } from 'react';
import type { Product } from '../../types';
import { Modal } from '../common/Modal';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!product) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');
    try {
      await onConfirm(product.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete product from database.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Product Deletion"
      subtitle="Permanent database removal from StockSense warehouse catalog"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Warning Icon & Message */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 space-y-1">
            <p className="font-semibold">Are you sure you want to delete this product?</p>
            <p className="text-rose-700">
              This will permanently delete the SKU record from SQLite and adjust inventory valuations.
            </p>
          </div>
        </div>

        {/* Product Details Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">SKU / Reference:</span>
            <span className="font-mono font-bold text-slate-900">{product.sku}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Product Name:</span>
            <span className="font-semibold text-slate-800">{product.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Category:</span>
            <span className="text-slate-700">{product.category}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Current Stock Quantity:</span>
            <span className="font-mono font-bold text-slate-900">
              {product.quantity.toLocaleString()} units
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Warehouse Facility:</span>
            <span className="text-slate-700">{product.warehouse_code}</span>
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
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-rose-600/20 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Product...</span>
              </>
            ) : (
              <span>Delete Product Permanently</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
