import React, { useState, useEffect } from 'react';
import type { Receipt, ReceiptFormData, Warehouse, Product, ReceiptStatus } from '../../types';
import { Modal } from '../common/Modal';
import { receiptsApi } from '../../api/receipts';
import { productsApi } from '../../api/products';
import { ReceiptStatusBadge } from './ReceiptStatusBadge';
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Package,
  Calendar,
  Warehouse as WarehouseIcon,
  CheckCircle2,
} from 'lucide-react';

interface ReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReceiptFormData) => Promise<void>;
  initialReceipt?: Receipt | null;
  warehouses: Warehouse[];
  availableProducts?: Product[];
}

interface FormLineItem {
  productId: number;
  quantity: number | string;
}

export const ReceiptFormModal: React.FC<ReceiptFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialReceipt,
  warehouses,
  availableProducts = [],
}) => {
  const isEditing = Boolean(initialReceipt);
  const isDone = initialReceipt?.status === 'Done';

  // Form Fields
  const [vendor, setVendor] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [status, setStatus] = useState<ReceiptStatus>('Draft');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<FormLineItem[]>([{ productId: 0, quantity: 1 }]);

  // Product list for dropdown
  const [products, setProducts] = useState<Product[]>(availableProducts);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Load products if not available
  useEffect(() => {
    if (isOpen && products.length === 0) {
      productsApi.getProducts({ sortBy: 'name', order: 'ASC' })
        .then((res) => setProducts(res.products))
        .catch((err) => console.error('Failed to load products for receipt line items:', err));
    }
  }, [isOpen, products.length]);

  // Load receipt details if editing
  useEffect(() => {
    if (!isOpen) return;

    if (initialReceipt) {
      setVendor(initialReceipt.vendor || '');
      setWarehouseCode(initialReceipt.warehouse_code || warehouses[0]?.code || 'WH-MAIN');
      setScheduledDate(initialReceipt.scheduled_date || '');
      setStatus(initialReceipt.status || 'Draft');
      setNotes(initialReceipt.notes || '');

      // Check if we need to fetch line items
      if (initialReceipt.items && initialReceipt.items.length > 0) {
        setItems(
          initialReceipt.items.map((it) => ({
            productId: it.product_id,
            quantity: it.quantity,
          }))
        );
      } else {
        // Fetch full receipt
        setIsLoadingDetails(true);
        receiptsApi.getReceiptById(initialReceipt.id)
          .then((res) => {
            if (res.receipt?.items?.length) {
              setItems(
                res.receipt.items.map((it) => ({
                  productId: it.product_id,
                  quantity: it.quantity,
                }))
              );
            } else {
              setItems([{ productId: 0, quantity: 1 }]);
            }
          })
          .catch((err) => {
            console.error('Failed to fetch full receipt line items:', err);
            setItems([{ productId: 0, quantity: 1 }]);
          })
          .finally(() => setIsLoadingDetails(false));
      }
    } else {
      // New receipt defaults
      setVendor('');
      setWarehouseCode(warehouses[0]?.code || 'WH-MAIN');
      const today = new Date().toISOString().split('T')[0];
      setScheduledDate(today);
      setStatus('Draft');
      setNotes('');
      setItems([{ productId: 0, quantity: 10 }]);
    }
    setFormError('');
  }, [initialReceipt, isOpen, warehouses]);

  // Line item manipulation
  const handleAddItem = () => {
    // Pick first product that isn't already selected, or 0
    const selectedIds = new Set(items.map((it) => it.productId));
    const nextProduct = products.find((p) => !selectedIds.has(p.id));
    setItems((prev) => [...prev, { productId: nextProduct?.id || 0, quantity: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity', value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Calculations
  const totalUnits = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

  const validate = (): string | null => {
    if (!vendor.trim()) return 'Vendor / Supplier name is required.';
    if (!warehouseCode) return 'Please select a destination warehouse facility.';
    if (!scheduledDate) return 'Scheduled arrival date is required.';

    if (items.length === 0) return 'At least one product line item is required.';

    const seenIds = new Set<number>();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const pId = Number(it.productId);
      const qty = Number(it.quantity);

      if (!pId || pId <= 0) {
        return `Line item #${i + 1}: Please select a valid product.`;
      }
      if (isNaN(qty) || qty <= 0) {
        return `Line item #${i + 1}: Quantity must be greater than 0.`;
      }
      if (seenIds.has(pId)) {
        const prod = products.find((p) => p.id === pId);
        return `Duplicate product selected: "${prod?.name || prod?.sku}". Each product can only appear once per receipt.`;
      }
      seenIds.add(pId);
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDone) {
      onClose();
      return;
    }

    setFormError('');
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        vendor: vendor.trim(),
        warehouseCode,
        scheduledDate,
        status,
        notes: notes.trim(),
        items: items.map((it) => ({
          productId: Number(it.productId),
          quantity: Number(it.quantity),
        })),
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save receipt. Please check form inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditing
          ? `Receipt ${initialReceipt?.reference}`
          : 'Create Inbound Receipt'
      }
      subtitle={
        isDone
          ? 'Completed receipt — inventory stock has been credited and recorded in SQLite'
          : isEditing
          ? 'Update vendor, schedule, receipt status, or modify incoming line items'
          : 'Schedule a new inbound inventory shipment and register incoming products'
      }
      maxWidth="xl"
    >
      {isLoadingDetails ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs">Loading receipt items...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Alert for Done receipts */}
          {isDone && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Receipt Completed & Stock Credited</p>
                <p className="text-emerald-700 mt-0.5">
                  This shipment has reached final <strong>Done</strong> status. Product stock counts in SQLite were automatically increased. Completed receipts are immutable.
                </p>
              </div>
            </div>
          )}

          {/* Warning when transitioning to Done */}
          {!isDone && status === 'Done' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Immediate Stock Impact Warning</p>
                <p className="text-amber-700 mt-0.5">
                  Saving with status <strong>Done</strong> will immediately increase stock quantities for all listed products in the warehouse database. Once saved as Done, this receipt cannot be reverted or deleted.
                </p>
              </div>
            </div>
          )}

          {/* Form Error */}
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Row 1: Vendor & Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="rfm-vendor" className="block text-xs font-semibold text-slate-700 mb-1">
                Vendor / Supplier <span className="text-rose-500">*</span>
              </label>
              <input
                id="rfm-vendor"
                type="text"
                placeholder="e.g. Apex Electronics Ltd, Global Logistics Corp"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                disabled={isDone}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="rfm-warehouse" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
                Destination Facility <span className="text-rose-500">*</span>
              </label>
              <select
                id="rfm-warehouse"
                value={warehouseCode}
                onChange={(e) => setWarehouseCode(e.target.value)}
                disabled={isDone}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
              >
                {warehouses.map((wh) => (
                  <option key={wh.code} value={wh.code}>
                    {wh.code} — {wh.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Scheduled Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="rfm-date" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Scheduled Arrival Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="rfm-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                disabled={isDone}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
              />
            </div>

            <div>
              <label htmlFor="rfm-status" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Receipt Status</span>
                {isEditing && <ReceiptStatusBadge status={status} size="sm" />}
              </label>
              <select
                id="rfm-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReceiptStatus)}
                disabled={isDone}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
              >
                <option value="Draft">Draft (Planning stage)</option>
                <option value="Waiting">Waiting (Dispatched / In Transit)</option>
                <option value="Ready">Ready (At Dock / Ready to Receive)</option>
                <option value="Done">Done (Received & Verified - Updates Stock)</option>
                {isEditing && <option value="Canceled">Canceled (Void Shipment)</option>}
              </select>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Product Line Items
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {items.length} {items.length === 1 ? 'line' : 'lines'}
                </span>
              </div>

              {!isDone && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              )}
            </div>

            {/* Items Table / List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    <span className="text-[11px] font-mono text-slate-400 w-5 shrink-0 text-center hidden sm:inline">
                      #{idx + 1}
                    </span>

                    {/* Product Selector */}
                    <div className="flex-1 min-w-0">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', Number(e.target.value))}
                        disabled={isDone}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
                      >
                        <option value={0}>-- Select incoming product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name} (Stock: {p.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Input */}
                    <div className="w-full sm:w-32 shrink-0 flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 shrink-0">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        disabled={isDone}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-right focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>

                    {/* Remove Line Button */}
                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 self-end sm:self-center"
                        title="Remove line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
            </div>

            {/* Total Units Summary */}
            <div className="p-2.5 rounded-lg bg-slate-100/80 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Total Incoming Stock Quantity:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {totalUnits.toLocaleString()} units
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="rfm-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes / PO Reference <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="rfm-notes"
              rows={2}
              placeholder="e.g. PO-88492. Container 4B. Priority intake inspection required."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isDone}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {isDone ? 'Close' : 'Cancel'}
            </button>

            {!isDone && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Receipt...</span>
                  </>
                ) : (
                  <span>{isEditing ? 'Save Changes' : 'Create Receipt'}</span>
                )}
              </button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
};
