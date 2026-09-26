import React, { useState, useEffect, useCallback } from 'react';
import type {
  InventoryAdjustment,
  InventoryAdjustmentFormData,
  InventoryAdjustmentStatus,
  InventoryAdjustmentType,
  Warehouse,
  Product,
} from '../../types';
import { Modal } from '../common/Modal';
import { inventoryAdjustmentsApi } from '../../api/inventoryAdjustments';
import { internalTransfersApi } from '../../api/internalTransfers';
import { productsApi } from '../../api/products';
import { InventoryAdjustmentStatusBadge } from './InventoryAdjustmentStatusBadge';
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
} from 'lucide-react';

interface InventoryAdjustmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InventoryAdjustmentFormData) => Promise<void>;
  initialAdjustment?: InventoryAdjustment | null;
  warehouses: Warehouse[];
  availableProducts?: Product[];
  reasons?: string[];
}

interface FormLineItem {
  productId: number;
  quantity: number | string;
}

const COMMON_REASONS = [
  'Routine ABC Cycle Count',
  'Annual Physical Inventory Audit',
  'Damaged Packaging Write-off',
  'Supplier Shortage Reconciliation',
  'Barcode Calibration Drift Correction',
  'Sample Testing Deduction',
  'Spill / Quarantine Scrap',
  'Unrecorded Inbound Intake',
];

type StockMap = Record<string, Record<number, number>>; // warehouseCode -> productId -> qty

export const InventoryAdjustmentFormModal: React.FC<InventoryAdjustmentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialAdjustment,
  warehouses,
  availableProducts = [],
  reasons = COMMON_REASONS,
}) => {
  const isEditing = Boolean(initialAdjustment);
  const isDone = initialAdjustment?.status === 'Done';
  const isCanceled = initialAdjustment?.status === 'Canceled';
  const isReadOnly = isDone || isCanceled;

  // ── Form Fields ──────────────────────────────────────────────────────────────
  const [warehouseCode, setWarehouseCode]   = useState('');
  const [reason, setReason]                 = useState('');
  const [adjustmentType, setAdjustmentType] = useState<InventoryAdjustmentType>('Increase');
  const [status, setStatus]                 = useState<InventoryAdjustmentStatus>('Draft');
  const [notes, setNotes]                   = useState('');
  const [items, setItems]                   = useState<FormLineItem[]>([{ productId: 0, quantity: 1 }]);

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

  // ── Fetch per-warehouse stock when warehouse changes ─────────────────────────
  const fetchWarehouseStock = useCallback(
    async (whCode: string) => {
      if (!whCode || stockCache[whCode]) return;
      try {
        setIsLoadingStock(true);
        const res = await internalTransfersApi.getWarehouseStock(whCode);
        const map: Record<number, number> = {};
        (res.products || []).forEach((p: any) => {
          map[p.id] = p.quantity;
        });
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

    if (initialAdjustment) {
      setWarehouseCode(initialAdjustment.warehouse_code || warehouses[0]?.code || '');
      setReason(initialAdjustment.reason || '');
      setAdjustmentType(initialAdjustment.adjustment_type || 'Increase');
      setStatus(initialAdjustment.status || 'Draft');
      setNotes(initialAdjustment.notes || '');

      if (initialAdjustment.items && initialAdjustment.items.length > 0) {
        setItems(
          initialAdjustment.items.map((it) => ({
            productId: it.product_id,
            quantity: it.quantity,
          }))
        );
      } else {
        setIsLoadingDetails(true);
        inventoryAdjustmentsApi
          .getInventoryAdjustmentById(initialAdjustment.id)
          .then((res) => {
            const fetched = res.inventoryAdjustment;
            if (fetched?.items && fetched.items.length > 0) {
              setItems(
                fetched.items.map((it) => ({
                  productId: it.product_id,
                  quantity: it.quantity,
                }))
              );
            }
          })
          .catch((err) => console.error('Failed to load adjustment details:', err))
          .finally(() => setIsLoadingDetails(false));
      }
    } else {
      // Create mode defaults
      const defaultWh = warehouses[0]?.code || 'WH-MAIN';
      setWarehouseCode(defaultWh);
      setReason('');
      setAdjustmentType('Increase');
      setStatus('Draft');
      setNotes('');
      setItems([{ productId: 0, quantity: 1 }]);
    }

    setFormError('');
  }, [isOpen, initialAdjustment, warehouses]);

  // Load stock whenever warehouseCode changes
  useEffect(() => {
    if (warehouseCode) {
      fetchWarehouseStock(warehouseCode);
    }
  }, [warehouseCode, fetchWarehouseStock]);

  // ── Line item helpers ────────────────────────────────────────────────────────
  const handleAddItem = () => {
    const selectedIds = new Set(items.map((i) => Number(i.productId)));
    const nextProduct = products.find((p) => !selectedIds.has(p.id));
    setItems((prev) => [...prev, { productId: nextProduct ? nextProduct.id : 0, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FormLineItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const getProductStock = (productId: number): number | null => {
    if (!productId || !warehouseCode) return null;
    const whStock = stockCache[warehouseCode]?.[productId];
    if (whStock !== undefined) return whStock;
    const prod = products.find((p) => p.id === productId);
    if (prod && prod.warehouse_code === warehouseCode) return prod.quantity;
    return 0;
  };

  // Calculate resulting stock based on adjustmentType
  const getResultingStock = (productId: number, qtyInput: number | string): number | null => {
    const current = getProductStock(productId);
    if (current === null) return null;
    const qty = Number(qtyInput) || 0;

    if (adjustmentType === 'Increase') return current + qty;
    if (adjustmentType === 'Decrease') return current - qty;
    if (adjustmentType === 'Set') return qty;
    return current;
  };

  // Check if any line item has insufficient stock on decrease
  const hasNegativeStockViolation = items.some((item) => {
    if (!item.productId) return false;
    const res = getResultingStock(item.productId, item.quantity);
    return res !== null && res < 0;
  });

  // ── Form Submission ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      onClose();
      return;
    }

    setFormError('');

    if (!warehouseCode) {
      setFormError('Please select a warehouse facility.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Please specify the reason for this inventory adjustment.');
      return;
    }
    if (items.length === 0) {
      setFormError('At least one product line item is required.');
      return;
    }

    const seenIds = new Set<number>();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId || it.productId === 0) {
        setFormError(`Please select a product for line #${i + 1}.`);
        return;
      }
      const q = Number(it.quantity);
      if (isNaN(q) || !Number.isInteger(q)) {
        setFormError(`Line #${i + 1}: Quantity must be a whole integer.`);
        return;
      }
      if (adjustmentType === 'Set' && q < 0) {
        setFormError(`Line #${i + 1}: Target quantity for Set cannot be negative.`);
        return;
      }
      if ((adjustmentType === 'Increase' || adjustmentType === 'Decrease') && q <= 0) {
        setFormError(`Line #${i + 1}: ${adjustmentType} quantity must be greater than 0.`);
        return;
      }
      if (seenIds.has(Number(it.productId))) {
        setFormError(`Duplicate product selected on line #${i + 1}. Each product can only appear once per adjustment.`);
        return;
      }
      seenIds.add(Number(it.productId));

      // Stock check for decrease
      if (adjustmentType === 'Decrease') {
        const currentStock = getProductStock(Number(it.productId)) ?? 0;
        if (currentStock < q) {
          const prod = products.find((p) => p.id === Number(it.productId));
          setFormError(
            `Insufficient stock for [${prod?.sku || 'Product'}] on line #${i + 1}. Available: ${currentStock}, Attempted decrease: ${q}. Resulting stock cannot be negative.`
          );
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        warehouseCode,
        reason: reason.trim(),
        adjustmentType,
        status,
        notes: notes.trim(),
        items: items.map((i) => ({
          productId: Number(i.productId),
          quantity: Math.floor(Number(i.quantity)),
        })),
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save inventory adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedWarehouse = warehouses.find((w) => w.code === warehouseCode);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isReadOnly
          ? `Audit Record: ${initialAdjustment?.reference}`
          : isEditing
          ? `Edit Adjustment: ${initialAdjustment?.reference}`
          : 'Create Inventory Adjustment'
      }
      subtitle={
        isReadOnly
          ? `Status: ${initialAdjustment?.status} — finalized stock audit log (Read-Only)`
          : 'Reconcile physical inventory counts with live SQLite stock records'
      }
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Read-only Status Banner ────────────────────────────────────────── */}
        {isReadOnly && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
              isDone
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isDone
                  ? 'This adjustment is DONE. Warehouse balances were reconciled and audit history is locked.'
                  : 'This adjustment was CANCELED and is archived for auditing.'}
              </span>
            </div>
            <InventoryAdjustmentStatusBadge status={initialAdjustment?.status || 'Done'} size="sm" />
          </div>
        )}

        {/* ── Form Error Banner ──────────────────────────────────────────────── */}
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* ── Section 1: Adjustment Type & Facility ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Warehouse Facility */}
          <div>
            <label htmlFor="ia-wh" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Warehouse Facility <span className="text-rose-500">*</span>
            </label>
            <select
              id="ia-wh"
              value={warehouseCode}
              onChange={(e) => setWarehouseCode(e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {warehouses.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name} ({w.code}) – {w.location}
                </option>
              ))}
            </select>
            {selectedWarehouse && (
              <p className="text-[11px] text-slate-400 mt-1">
                Zone: {selectedWarehouse.location}
              </p>
            )}
          </div>

          {/* Adjustment Type */}
          <div>
            <label htmlFor="ia-type" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Adjustment Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Increase', 'Decrease', 'Set'] as InventoryAdjustmentType[]).map((t) => {
                const isSelected = adjustmentType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setAdjustmentType(t)}
                    className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all flex flex-col items-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                      isSelected
                        ? t === 'Increase'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-xs'
                          : t === 'Decrease'
                          ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                          : 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {t === 'Increase' && <TrendingUp className="w-3.5 h-3.5" />}
                      {t === 'Decrease' && <TrendingDown className="w-3.5 h-3.5" />}
                      {t === 'Set' && <Target className="w-3.5 h-3.5" />}
                      <span>{t}</span>
                    </div>
                    <span className="text-[10px] font-normal text-slate-400">
                      {t === 'Increase' ? 'Add (+)' : t === 'Decrease' ? 'Sub (-)' : 'Exact (=)'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Section 2: Reason & Status ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Reason */}
          <div className="sm:col-span-2">
            <label htmlFor="ia-reason" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Audit Reason / Purpose <span className="text-rose-500">*</span>
            </label>
            <input
              id="ia-reason"
              type="text"
              placeholder="e.g., Routine ABC Cycle Count, Scrap write-off..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isReadOnly}
              list="reason-suggestions"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <datalist id="reason-suggestions">
              {reasons.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>

            {/* Quick-select chips */}
            {!isReadOnly && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {reasons.slice(0, 4).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  >
                    + {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="ia-status" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Adjustment Status <span className="text-rose-500">*</span>
            </label>
            <select
              id="ia-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as InventoryAdjustmentStatus)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="Draft">Draft (Staged)</option>
              <option value="Waiting">Waiting (Pending Approval)</option>
              <option value="Ready">Ready (Verified)</option>
              <option value="Done">Done (Reconcile Stock)</option>
              {isEditing && <option value="Canceled">Canceled (Void)</option>}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              {status === 'Done'
                ? '⚠️ Selecting Done will reconcile SQLite stock balances immediately upon save.'
                : 'Stock remains unchanged until status is set to Done.'}
            </p>
          </div>
        </div>

        {/* ── Section 3: Product Line Items ──────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Product Line Items & Quantity Calculation
              </h3>
              {isLoadingStock && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              )}
            </div>

            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            )}
          </div>

          {/* Line items table / cards */}
          <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 bg-slate-50/50">
            {isLoadingDetails ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                Loading line items...
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No items added. Click &quot;Add Product&quot; to add a product line.
              </div>
            ) : (
              items.map((item, idx) => {
                const currentStock = getProductStock(Number(item.productId));
                const resultingStock = getResultingStock(Number(item.productId), item.quantity);
                const isNegative = resultingStock !== null && resultingStock < 0;

                return (
                  <div key={idx} className="p-3.5 bg-white space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
                    {/* Line Index */}
                    <span className="text-[11px] font-bold text-slate-400 w-5 shrink-0">
                      #{idx + 1}
                    </span>

                    {/* Product Select */}
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 sm:hidden">
                        Product
                      </label>
                      <select
                        value={item.productId || ''}
                        onChange={(e) => handleItemChange(idx, 'productId', Number(e.target.value))}
                        disabled={isReadOnly}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed truncate"
                      >
                        <option value="">Select a product...</option>
                        {products.map((p) => {
                          const whStock = stockCache[warehouseCode]?.[p.id];
                          const stockLabel = whStock !== undefined ? `${whStock} in ${warehouseCode}` : `Global ${p.quantity}`;
                          return (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.name} ({stockLabel})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Current Stock Display */}
                    <div className="w-full sm:w-28 shrink-0">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Current
                      </label>
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-slate-700 text-center">
                        {currentStock !== null ? `${currentStock} units` : '—'}
                      </div>
                    </div>

                    {/* Adjustment Quantity Input */}
                    <div className="w-full sm:w-32 shrink-0">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        {adjustmentType === 'Increase'
                          ? 'Add (+)'
                          : adjustmentType === 'Decrease'
                          ? 'Reduce (-)'
                          : 'Target (=)'}
                      </label>
                      <input
                        type="number"
                        min={adjustmentType === 'Set' ? '0' : '1'}
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        disabled={isReadOnly}
                        className={`w-full px-3 py-1.5 text-xs bg-slate-50 border rounded-lg font-mono font-semibold focus:bg-white focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                          isNegative
                            ? 'border-rose-400 text-rose-700 focus:ring-rose-500'
                            : 'border-slate-200 text-slate-800 focus:ring-amber-500'
                        }`}
                      />
                    </div>

                    {/* Resulting Stock Display */}
                    <div className="w-full sm:w-32 shrink-0">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Resulting
                      </label>
                      <div
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold text-center flex items-center justify-center gap-1 ${
                          isNegative
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : resultingStock !== null && resultingStock > (currentStock ?? 0)
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : resultingStock !== null && resultingStock < (currentStock ?? 0)
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {isNegative && <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />}
                        <span>{resultingStock !== null ? `${resultingStock} units` : '—'}</span>
                      </div>
                    </div>

                    {/* Delete Item */}
                    {!isReadOnly && items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Negative Stock Alert */}
          {hasNegativeStockViolation && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>
                One or more items will result in negative inventory balance. Adjust the quantities before saving.
              </span>
            </div>
          )}
        </div>

        {/* ── Section 4: Notes ──────────────────────────────────────────────── */}
        <div>
          <label htmlFor="ia-notes" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Audit Log Notes & Justification
          </label>
          <textarea
            id="ia-notes"
            rows={2}
            placeholder="Provide context, supervisor sign-off, or discrepancy explanation..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isReadOnly}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>

          {!isReadOnly && (
            <button
              type="submit"
              disabled={isSubmitting || hasNegativeStockViolation}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Update Adjustment' : 'Create Adjustment'}</span>
              )}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};
