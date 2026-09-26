import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { purchaseOrdersApi } from '../../api/purchaseOrders';
import type { PurchaseOrder, PurchaseOrderFormData, PurchaseOrderStatus, Warehouse, Product, Supplier } from '../../types';
import { Loader2, Plus, Trash2, ShoppingCart, DollarSign, Calculator, AlertTriangle } from 'lucide-react';

interface PurchaseOrderFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  purchaseOrder?: PurchaseOrder | null;
  warehouses: Warehouse[];
  suppliers: Pick<Supplier, 'id' | 'code' | 'name' | 'payment_terms'>[];
  products: Product[];
}

interface FormItem {
  productId: number | '';
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export const PurchaseOrderFormModal: React.FC<PurchaseOrderFormModalProps> = ({
  open,
  onClose,
  onSaved,
  purchaseOrder,
  warehouses,
  suppliers,
  products,
}) => {
  const { showToast } = useToast();
  const isEdit = !!purchaseOrder;
  const isReadOnly = isEdit && ['Done', 'Received', 'Canceled'].includes(purchaseOrder?.status || '');

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [warehouseCode, setWarehouseCode] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(today);
  const [expectedDate, setExpectedDate] = useState<string>(nextWeek);
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<PurchaseOrderStatus>('Draft');
  const [items, setItems] = useState<FormItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (isEdit && purchaseOrder) {
        setSupplierId(purchaseOrder.supplier_id);
        setWarehouseCode(purchaseOrder.warehouse_code);
        setOrderDate(purchaseOrder.order_date || today);
        setExpectedDate(purchaseOrder.expected_date || nextWeek);
        setPaymentTerms(purchaseOrder.payment_terms || 'Net 30');
        setNotes(purchaseOrder.notes || '');
        setStatus(purchaseOrder.status || 'Draft');

        if (purchaseOrder.items && purchaseOrder.items.length > 0) {
          setItems(
            purchaseOrder.items.map((it) => ({
              productId: it.product_id,
              quantity: it.quantity,
              unitPrice: it.unit_price,
              taxRate: it.tax_rate,
              discount: it.discount,
            }))
          );
        } else {
          setItems([]);
        }
      } else {
        setSupplierId(suppliers.length > 0 ? suppliers[0].id : '');
        setWarehouseCode(warehouses.length > 0 ? warehouses[0].code : 'WH-MAIN');
        setOrderDate(today);
        setExpectedDate(nextWeek);
        setPaymentTerms('Net 30');
        setNotes('');
        setStatus('Draft');

        if (products.length > 0) {
          setItems([
            {
              productId: products[0].id,
              quantity: 10,
              unitPrice: products[0].unit_price,
              taxRate: 0,
              discount: 0,
            },
          ]);
        } else {
          setItems([]);
        }
      }
      setError('');
    }
  }, [open, isEdit, purchaseOrder, suppliers, warehouses, products]);

  // When supplier changes, update default payment terms if available
  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    setSupplierId(val || '');
    const found = suppliers.find((s) => s.id === val);
    if (found?.payment_terms) {
      setPaymentTerms(found.payment_terms);
    }
  };

  // Item lines handlers
  const handleAddItem = () => {
    const availableProd = products.find((p) => !items.some((it) => it.productId === p.id)) || products[0];
    if (!availableProd) return;
    setItems((prev) => [
      ...prev,
      {
        productId: availableProd.id,
        quantity: 10,
        unitPrice: availableProd.unit_price,
        taxRate: 0,
        discount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemProductChange = (index: number, pid: number) => {
    const prod = products.find((p) => p.id === pid);
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              productId: pid,
              unitPrice: prod ? prod.unit_price : it.unitPrice,
            }
          : it
      )
    );
  };

  const handleItemValueChange = (index: number, key: keyof FormItem, val: number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [key]: val } : it))
    );
  };

  // Compute live calculations
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  items.forEach((it) => {
    const base = (it.quantity || 0) * (it.unitPrice || 0);
    const disc = base * ((it.discount || 0) / 100);
    const tax = (base - disc) * ((it.taxRate || 0) / 100);
    subtotal += base;
    discountTotal += disc;
    taxTotal += tax;
  });

  const grandTotal = subtotal - discountTotal + taxTotal;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setError('Please select a supplier vendor');
      return;
    }
    if (!warehouseCode) {
      setError('Please select a destination warehouse');
      return;
    }
    if (items.length === 0) {
      setError('Purchase order must contain at least one product line item');
      return;
    }

    // Check duplicate products
    const pids = items.map((it) => it.productId);
    const hasDup = pids.some((id, idx) => pids.indexOf(id) !== idx);
    if (hasDup) {
      setError('Duplicate product line items are not allowed. Each product can only appear once per PO.');
      return;
    }

    // Check invalid quantities
    for (const it of items) {
      if (!it.productId) {
        setError('Please select a product for all line items');
        return;
      }
      if (it.quantity <= 0 || !Number.isInteger(it.quantity)) {
        setError('Product quantities must be positive integers greater than 0');
        return;
      }
      if (it.unitPrice < 0) {
        setError('Unit prices cannot be negative');
        return;
      }
    }

    const payload: PurchaseOrderFormData = {
      supplierId: Number(supplierId),
      warehouseCode,
      orderDate,
      expectedDate,
      paymentTerms,
      notes,
      status,
      items: items.map((it) => ({
        productId: Number(it.productId),
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate),
        discount: Number(it.discount),
      })),
    };

    setLoading(true);
    setError('');
    try {
      if (isEdit && purchaseOrder) {
        await purchaseOrdersApi.updatePurchaseOrder(purchaseOrder.id, payload);
        showToast('success', 'Purchase Order Updated', `Updated ${purchaseOrder.reference}`);
      } else {
        const res = await purchaseOrdersApi.createPurchaseOrder(payload);
        showToast('success', 'Purchase Order Created', `Generated PO reference ${res.purchaseOrder.reference}`);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save purchase order');
      showToast('error', 'Error', err?.message || 'Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? `Purchase Order: ${purchaseOrder?.reference}` : 'Create New Purchase Order'}
      subtitle="Issue vendor procurement order and track expected warehouse stock intake"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {isReadOnly && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
            This purchase order is in <strong>{purchaseOrder?.status}</strong> status and is read-only.
          </div>
        )}

        {/* Header Grid: Supplier & Warehouse */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Supplier Vendor */}
          <div>
            <label htmlFor="po-supplier-select" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Supplier Vendor *
            </label>
            <select
              id="po-supplier-select"
              value={supplierId}
              onChange={handleSupplierChange}
              disabled={isReadOnly}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:bg-slate-100"
            >
              <option value="">Select Vendor...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Destination Warehouse */}
          <div>
            <label htmlFor="po-warehouse-select" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Destination Warehouse *
            </label>
            <select
              id="po-warehouse-select"
              value={warehouseCode}
              onChange={(e) => setWarehouseCode(e.target.value)}
              disabled={isReadOnly}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:bg-slate-100"
            >
              <option value="">Select Warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Order Date */}
          <div>
            <label htmlFor="po-order-date" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Order Date *
            </label>
            <input
              id="po-order-date"
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              disabled={isReadOnly}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label htmlFor="po-expected-date" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Expected Delivery Date *
            </label>
            <input
              id="po-expected-date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              disabled={isReadOnly}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>

          {/* Payment Terms */}
          <div>
            <label htmlFor="po-payment-terms" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Payment Terms
            </label>
            <select
              id="po-payment-terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:bg-slate-100"
            >
              <option value="Net 30">Net 30</option>
              <option value="Net 45">Net 45</option>
              <option value="Net 60">Net 60</option>
              <option value="Net 15">Net 15</option>
              <option value="Immediate">Immediate</option>
              <option value="COD">COD</option>
            </select>
          </div>

          {/* Workflow Status */}
          <div>
            <label htmlFor="po-status-select" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Workflow Status
            </label>
            <select
              id="po-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:bg-slate-100"
            >
              <option value="Draft">Draft (Drafting)</option>
              <option value="Waiting">Waiting Approval</option>
              <option value="Ready">Ready / Dispatched</option>
              <option value="Done">Done (Execute Stock Intake)</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
              Order Line Items ({items.length})
            </h4>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product Line</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const lineBase = (item.quantity || 0) * (item.unitPrice || 0);
              const lineDisc = lineBase * ((item.discount || 0) / 100);
              const lineTax = (lineBase - lineDisc) * ((item.taxRate || 0) / 100);
              const lineTotal = lineBase - lineDisc + lineTax;

              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                >
                  {/* Product Dropdown (5 cols) */}
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Product Item</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemProductChange(idx, Number(e.target.value))}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:bg-slate-100"
                    >
                      <option value="">Select Product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.sku}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity (2 cols) */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemValueChange(idx, 'quantity', Number(e.target.value))}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  {/* Unit Price (2 cols) */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Unit Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => handleItemValueChange(idx, 'unitPrice', Number(e.target.value))}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  {/* Line Total (3 cols) */}
                  <div className="sm:col-span-3 flex items-center justify-between pl-2">
                    <div>
                      <span className="block text-[10px] text-slate-500">Line Total</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        ${lineTotal.toFixed(2)}
                      </span>
                    </div>

                    {!isReadOnly && items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calculation Summary Card */}
        <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="text-slate-400 flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              Subtotal:
            </span>
            <span className="font-mono font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Tax Total:</span>
            <span className="font-mono text-slate-300">+${taxTotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Discount Total:</span>
            <span className="font-mono text-slate-300">-${discountTotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-slate-800 text-emerald-400">
            <span>Grand Total:</span>
            <span className="font-mono text-base flex items-center">
              <DollarSign className="w-4 h-4" />
              {grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="po-notes" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Order Notes / Instructions
          </label>
          <textarea
            id="po-notes"
            rows={2}
            placeholder="Special delivery instructions, dock requirements, contract notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isReadOnly}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
          />
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {!isReadOnly && (
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Order...</span>
                </>
              ) : (
                <span>{isEdit ? 'Save Changes' : 'Create Purchase Order'}</span>
              )}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};
