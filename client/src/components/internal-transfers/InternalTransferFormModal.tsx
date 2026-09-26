import React, { useState, useEffect, useCallback } from 'react';
import type {
  InternalTransfer,
  InternalTransferFormData,
  InternalTransferStatus,
  Warehouse,
  Product,
} from '../../types';
import { Modal } from '../common/Modal';
import { internalTransfersApi } from '../../api/internalTransfers';
import { productsApi } from '../../api/products';
import { InternalTransferStatusBadge } from './InternalTransferStatusBadge';
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Package,
  Calendar,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface InternalTransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InternalTransferFormData) => Promise<void>;
  initialTransfer?: InternalTransfer | null;
  warehouses: Warehouse[];
  availableProducts?: Product[];
}

interface FormLineItem {
  productId: number;
  quantity: number | string;
}

// Stock cache to avoid redundant API calls within the modal session
type StockMap = Record<string, Record<number, number>>; // warehouseCode -> productId -> qty

export const InternalTransferFormModal: React.FC<InternalTransferFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTransfer,
  warehouses,
  availableProducts = [],
}) => {
  const isEditing = Boolean(initialTransfer);
  const isDone = initialTransfer?.status === 'Done';
  const isCanceled = initialTransfer?.status === 'Canceled';
  const isReadOnly = isDone || isCanceled;

  // ── Form Fields ──────────────────────────────────────────────────────────────
  const [sourceWarehouseCode, setSourceWarehouseCode] = useState('');
  const [destWarehouseCode, setDestWarehouseCode]     = useState('');
  const [scheduledDate, setScheduledDate]             = useState('');
  const [status, setStatus]                           = useState<InternalTransferStatus>('Draft');
  const [notes, setNotes]                             = useState('');
  const [items, setItems]                             = useState<FormLineItem[]>([{ productId: 0, quantity: 1 }]);

  // ── Product list & stock cache ───────────────────────────────────────────────
  const [products, setProducts]             = useState<Product[]>(availableProducts);
  const [stockCache, setStockCache]         = useState<StockMap>({});
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [formError, setFormError]           = useState('');

  // ── Fetch products list once ─────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && products.length === 0) {
      productsApi
        .getProducts({ sortBy: 'name', order: 'ASC' })
        .then((res) => setProducts(res.products))
        .catch((err) => console.error('Failed to load products:', err));
    }
  }, [isOpen, products.length]);

  // ── Fetch per-warehouse stock when source changes ────────────────────────────
  const fetchSourceStock = useCallback(
    async (whCode: string) => {
      if (!whCode || stockCache[whCode]) return;
      try {
        setIsLoadingStock(true);
        const res = await internalTransfersApi.getWarehouseStock(whCode);
        const map: Record<number, number> = {};
        (res.products || []).forEach((p: any) => { map[p.id] = p.quantity; });
        setStockCache((prev) => ({ ...prev, [whCode]: map }));
      } catch {
        /* silent – stock values will just not display */
      } finally {
        setIsLoadingStock(false);
      }
    },
    [stockCache]
  );

  // ── Seed form when opening / editing ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (initialTransfer) {
      setSourceWarehouseCode(initialTransfer.source_warehouse_code || warehouses[0]?.code || '');
      setDestWarehouseCode(initialTransfer.dest_warehouse_code || '');
      setScheduledDate(initialTransfer.scheduled_date || '');
      setStatus(initialTransfer.status || 'Draft');
      setNotes(initialTransfer.notes || '');

      if (initialTransfer.items && initialTransfer.items.length > 0) {
        setItems(
          initialTransfer.items.map((it) => ({
            productId: it.product_id,
            quantity: it.quantity,
          }))
        );
      } else {
        setIsLoadingDetails(true);
        internalTransfersApi
          .getInternalTransferById(initialTransfer.id)
          .then((res) => {
            const its = res.internalTransfer?.items;
            setItems(
              its && its.length > 0
                ? its.map((it) => ({ productId: it.product_id, quantity: it.quantity }))
                : [{ productId: 0, quantity: 1 }]
            );
          })
          .catch(() => setItems([{ productId: 0, quantity: 1 }]))
          .finally(() => setIsLoadingDetails(false));
      }
      // Pre-fetch source warehouse stock
      fetchSourceStock(initialTransfer.source_warehouse_code);
    } else {
      // New transfer defaults
      const firstCode  = warehouses[0]?.code || '';
      const secondCode = warehouses[1]?.code || '';
      setSourceWarehouseCode(firstCode);
      setDestWarehouseCode(secondCode);
      setScheduledDate(new Date().toISOString().split('T')[0]);
      setStatus('Draft');
      setNotes('');
      setItems([{ productId: 0, quantity: 5 }]);
      if (firstCode) fetchSourceStock(firstCode);
    }
    setFormError('');
  }, [initialTransfer, isOpen, warehouses]);

  // ── Fetch stock whenever sourceWarehouse changes ─────────────────────────────
  useEffect(() => {
    if (sourceWarehouseCode) fetchSourceStock(sourceWarehouseCode);
  }, [sourceWarehouseCode]);

  // ── Line item helpers ────────────────────────────────────────────────────────
  const handleAddItem = () => {
    const selectedIds = new Set(items.map((it) => it.productId));
    const next = products.find((p) => !selectedIds.has(p.id));
    setItems((prev) => [...prev, { productId: next?.id || 0, quantity: 5 }]);
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

  // ── Derived ──────────────────────────────────────────────────────────────────
  const totalUnits = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

  const getSourceStock = (productId: number): number | null => {
    const map = stockCache[sourceWarehouseCode];
    if (!map) return null;
    return map[productId] ?? 0;
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!sourceWarehouseCode)            return 'Source warehouse is required.';
    if (!destWarehouseCode)              return 'Destination warehouse is required.';
    if (sourceWarehouseCode === destWarehouseCode)
      return 'Source and destination warehouses must be different facilities.';
    if (!scheduledDate)                  return 'Scheduled transfer date is required.';
    if (items.length === 0)              return 'At least one product line item is required.';

    const seenIds = new Set<number>();
    for (let i = 0; i < items.length; i++) {
      const it  = items[i];
      const pId = Number(it.productId);
      const qty = Number(it.quantity);

      if (!pId || pId <= 0) return `Line item #${i + 1}: Please select a valid product.`;
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty))
        return `Line item #${i + 1}: Quantity must be a positive whole number.`;
      if (seenIds.has(pId)) {
        const prod = products.find((p) => p.id === pId);
        return `Duplicate product: "${prod?.name || prod?.sku}". Each product can only appear once per transfer.`;
      }
      seenIds.add(pId);

      // Stock sufficiency pre-check (client-side) when saving as Done
      if (status === 'Done') {
        const avail = getSourceStock(pId);
        if (avail !== null && qty > avail) {
          const prod = products.find((p) => p.id === pId);
          return `Insufficient stock at source [${sourceWarehouseCode}] for "${prod?.name || prod?.sku}". Available: ${avail}, Requested: ${qty}.`;
        }
      }
    }
    return null;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) { onClose(); return; }

    setFormError('');
    const err = validate();
    if (err) { setFormError(err); return; }

    setIsSubmitting(true);
    try {
      await onSubmit({
        sourceWarehouseCode,
        destWarehouseCode,
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
      setFormError(err.message || 'Failed to save internal transfer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Internal Transfer ${initialTransfer?.reference}` : 'Create Internal Transfer'}
      subtitle={
        isDone
          ? 'Completed transfer — stock has been atomically relocated between warehouses'
          : isCanceled
          ? 'Canceled transfer — view only'
          : isEditing
          ? 'Update route, schedule, status, or modify transfer line items'
          : 'Schedule a new inter-facility stock relocation between warehouses'
      }
      maxWidth="xl"
    >
      {isLoadingDetails ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          <p className="text-xs">Loading transfer line items...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Done alert */}
          {isDone && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Transfer Completed — Stock Relocated</p>
                <p className="text-emerald-700 mt-0.5">
                  This transfer reached <strong>Done</strong> status. Stock was atomically deducted from{' '}
                  <strong>{initialTransfer?.source_warehouse_code}</strong> and added to{' '}
                  <strong>{initialTransfer?.dest_warehouse_code}</strong>. Completed transfers are immutable.
                </p>
              </div>
            </div>
          )}

          {/* Canceled alert */}
          {isCanceled && !isDone && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="font-medium">This transfer was canceled. No stock movement occurred.</p>
            </div>
          )}

          {/* Warning when setting Done */}
          {!isReadOnly && status === 'Done' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Immediate Stock Movement Warning</p>
                <p className="text-amber-700 mt-0.5">
                  Saving with status <strong>Done</strong> will atomically move stock: deducting from{' '}
                  <strong>{sourceWarehouseCode || '(source)'}</strong> and adding to{' '}
                  <strong>{destWarehouseCode || '(destination)'}</strong>. The server verifies stock sufficiency before committing.
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

          {/* ── Row 1: Warehouse Route ── */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-end">
            {/* Source */}
            <div>
              <label htmlFor="itfm-src" className="block text-xs font-semibold text-slate-700 mb-1">
                From Warehouse (Source) <span className="text-rose-500">*</span>
              </label>
              <select
                id="itfm-src"
                value={sourceWarehouseCode}
                onChange={(e) => setSourceWarehouseCode(e.target.value)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
              >
                <option value="">— Select source —</option>
                {warehouses.map((wh) => (
                  <option key={wh.code} value={wh.code}>
                    {wh.code} — {wh.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center pb-2">
              <div className="flex items-center gap-1 text-violet-400">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>

            {/* Destination */}
            <div>
              <label htmlFor="itfm-dst" className="block text-xs font-semibold text-slate-700 mb-1">
                To Warehouse (Destination) <span className="text-rose-500">*</span>
              </label>
              <select
                id="itfm-dst"
                value={destWarehouseCode}
                onChange={(e) => setDestWarehouseCode(e.target.value)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
              >
                <option value="">— Select destination —</option>
                {warehouses
                  .filter((wh) => wh.code !== sourceWarehouseCode)
                  .map((wh) => (
                    <option key={wh.code} value={wh.code}>
                      {wh.code} — {wh.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* ── Row 2: Date & Status ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="itfm-date" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Scheduled Transfer Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="itfm-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
              />
            </div>

            <div>
              <label htmlFor="itfm-status" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Transfer Status</span>
                {isEditing && <InternalTransferStatusBadge status={status} size="sm" />}
              </label>
              <select
                id="itfm-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as InternalTransferStatus)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
              >
                <option value="Draft">Draft (Transfer staged)</option>
                <option value="Waiting">Waiting (Pending logistics confirmation)</option>
                <option value="Ready">Ready (Loaded & awaiting dispatch)</option>
                <option value="Done">Done (Dispatched — Moves Stock)</option>
                {isEditing && <option value="Canceled">Canceled (Void transfer)</option>}
              </select>
            </div>
          </div>

          {/* ── Line Items Section ── */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-violet-600" />
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Transfer Line Items
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {items.length} {items.length === 1 ? 'line' : 'lines'}
                </span>
                {isLoadingStock && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                )}
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              )}
            </div>

            {/* Items list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const prod         = products.find((p) => p.id === Number(item.productId));
                const sourceStock  = getSourceStock(Number(item.productId));
                const requestedQty = Number(item.quantity) || 0;
                const isOverStock  = sourceStock !== null && requestedQty > sourceStock && status === 'Done';
                const hasStock     = sourceStock !== null;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 transition-colors ${
                      isOverStock ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-[11px] font-mono text-slate-400 w-5 shrink-0 text-center hidden sm:inline">
                      #{idx + 1}
                    </span>

                    {/* Product selector */}
                    <div className="flex-1 min-w-0">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', Number(e.target.value))}
                        disabled={isReadOnly}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
                      >
                        <option value={0}>-- Select product --</option>
                        {products.map((p) => {
                          const avail = stockCache[sourceWarehouseCode]?.[p.id] ?? null;
                          return (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.name}
                              {avail !== null ? ` (Src Stock: ${avail})` : ''}
                            </option>
                          );
                        })}
                      </select>

                      {/* Stock availability indicator */}
                      {prod && hasStock && (
                        <div className={`mt-0.5 text-[10px] font-medium ${
                          isOverStock ? 'text-rose-600' : 'text-slate-400'
                        }`}>
                          {isOverStock
                            ? `⚠ Only ${sourceStock} units available at ${sourceWarehouseCode}`
                            : `✓ ${sourceStock} units available at ${sourceWarehouseCode}`}
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="w-full sm:w-32 shrink-0 flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 shrink-0">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        disabled={isReadOnly}
                        className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg text-slate-900 font-mono text-right focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500 ${
                          isOverStock
                            ? 'border-rose-400 focus:ring-rose-500 text-rose-700 font-bold'
                            : 'border-slate-200 focus:ring-violet-500'
                        }`}
                      />
                    </div>

                    {/* Remove */}
                    {!isReadOnly && (
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
                );
              })}
            </div>

            {/* Total units summary */}
            <div className="p-2.5 rounded-lg bg-violet-50/60 border border-violet-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Total Units to Transfer:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {totalUnits.toLocaleString()} units
              </span>
            </div>
          </div>

          {/* ── Notes ── */}
          <div>
            <label htmlFor="itfm-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Transfer Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="itfm-notes"
              rows={2}
              placeholder="e.g. Seasonal rebalancing. Truck #3 dispatched. Notify hub manager on arrival."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-100 disabled:text-slate-500 resize-none"
            />
          </div>

          {/* ── Footer Actions ── */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>

            {!isReadOnly && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{isEditing ? 'Save Changes' : 'Create Transfer'}</span>
                )}
              </button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
};
