import React, { useState, useEffect } from 'react';
import type { DeliveryOrder, DeliveryOrderFormData, Warehouse, Product, DeliveryOrderStatus } from '../../types';
import { Modal } from '../common/Modal';
import { deliveryOrdersApi } from '../../api/deliveryOrders';
import { productsApi } from '../../api/products';
import { DeliveryOrderStatusBadge } from './DeliveryOrderStatusBadge';
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Package,
  Calendar,
  Warehouse as WarehouseIcon,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface DeliveryOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DeliveryOrderFormData) => Promise<void>;
  initialOrder?: DeliveryOrder | null;
  warehouses: Warehouse[];
  availableProducts?: Product[];
}

interface FormLineItem {
  productId: number;
  quantity: number | string;
}

export const DeliveryOrderFormModal: React.FC<DeliveryOrderFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialOrder,
  warehouses,
  availableProducts = [],
}) => {
  const isEditing = Boolean(initialOrder);
  const isDone = initialOrder?.status === 'Done';

  // Form Fields
  const [customer, setCustomer] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [status, setStatus] = useState<DeliveryOrderStatus>('Draft');
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
        .catch((err) => console.error('Failed to load products for delivery line items:', err));
    }
  }, [isOpen, products.length]);

  // Load order details if editing
  useEffect(() => {
    if (!isOpen) return;

    if (initialOrder) {
      setCustomer(initialOrder.customer || '');
      setWarehouseCode(initialOrder.warehouse_code || warehouses[0]?.code || 'WH-MAIN');
      setDestinationAddress(initialOrder.destination_address || '');
      setScheduledDate(initialOrder.scheduled_date || '');
      setStatus(initialOrder.status || 'Draft');
      setNotes(initialOrder.notes || '');

      // Check if we need to fetch line items
      if (initialOrder.items && initialOrder.items.length > 0) {
        setItems(
          initialOrder.items.map((it) => ({
            productId: it.product_id,
            quantity: it.quantity,
          }))
        );
      } else {
        // Fetch full order
        setIsLoadingDetails(true);
        deliveryOrdersApi.getDeliveryOrderById(initialOrder.id)
          .then((res) => {
            if (res.deliveryOrder?.items?.length) {
              setItems(
                res.deliveryOrder.items.map((it) => ({
                  productId: it.product_id,
                  quantity: it.quantity,
                }))
              );
            } else {
              setItems([{ productId: 0, quantity: 1 }]);
            }
          })
          .catch((err) => {
            console.error('Failed to fetch full delivery order line items:', err);
            setItems([{ productId: 0, quantity: 1 }]);
          })
          .finally(() => setIsLoadingDetails(false));
      }
    } else {
      // New delivery order defaults
      setCustomer('');
      setWarehouseCode(warehouses[0]?.code || 'WH-MAIN');
      setDestinationAddress('');
      const today = new Date().toISOString().split('T')[0];
      setScheduledDate(today);
      setStatus('Draft');
      setNotes('');
      setItems([{ productId: 0, quantity: 5 }]);
    }
    setFormError('');
  }, [initialOrder, isOpen, warehouses]);

  // Line item manipulation
  const handleAddItem = () => {
    const selectedIds = new Set(items.map((it) => it.productId));
    const nextProduct = products.find((p) => !selectedIds.has(p.id) && p.quantity > 0);
    setItems((prev) => [...prev, { productId: nextProduct?.id || 0, quantity: 5 }]);
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
    if (!customer.trim()) return 'Customer / Partner name is required.';
    if (!warehouseCode) return 'Please select a source warehouse facility.';
    if (!destinationAddress.trim()) return 'Destination / delivery address is required.';
    if (!scheduledDate) return 'Scheduled delivery date is required.';

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
        return `Duplicate product selected: "${prod?.name || prod?.sku}". Each product can only appear once per delivery order.`;
      }
      seenIds.add(pId);

      // Check stock sufficiency if status is Done
      if (status === 'Done') {
        const prod = products.find((p) => p.id === pId);
        if (prod && prod.quantity < qty) {
          return `Insufficient stock for [${prod.sku}] "${prod.name}". Available: ${prod.quantity} units, Requested: ${qty} units.`;
        }
      }
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
        customer: customer.trim(),
        warehouseCode,
        destinationAddress: destinationAddress.trim(),
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
      setFormError(err.message || 'Failed to save delivery order. Please check form inputs.');
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
          ? `Delivery Order ${initialOrder?.reference}`
          : 'Create Delivery Order'
      }
      subtitle={
        isDone
          ? 'Completed delivery order — inventory stock has been deducted and dispatched'
          : isEditing
          ? 'Update customer, destination, schedule, or modify outbound line items'
          : 'Schedule a new outbound delivery and allocate stock from warehouse storage'
      }
      maxWidth="xl"
    >
      {isLoadingDetails ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs">Loading order line items...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Alert for Done orders */}
          {isDone && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Order Dispatched & Stock Deducted</p>
                <p className="text-emerald-700 mt-0.5">
                  This delivery order has reached final <strong>Done</strong> status. Product inventory quantities in SQLite were automatically deducted. Completed orders are immutable.
                </p>
              </div>
            </div>
          )}

          {/* Warning when transitioning to Done */}
          {!isDone && status === 'Done' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Immediate Stock Deduction Warning</p>
                <p className="text-amber-700 mt-0.5">
                  Saving with status <strong>Done</strong> will immediately deduct stock quantities for all listed products from warehouse inventory. System verifies that sufficient stock is available.
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

          {/* Row 1: Customer & Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="dofm-customer" className="block text-xs font-semibold text-slate-700 mb-1">
                Customer / Partner <span className="text-rose-500">*</span>
              </label>
              <input
                id="dofm-customer"
                type="text"
                placeholder="e.g. Omni Retail Group, Pacific Supplies"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                disabled={isDone}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="dofm-warehouse" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
                Source Warehouse Facility <span className="text-rose-500">*</span>
              </label>
              <select
                id="dofm-warehouse"
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

          {/* Row 2: Destination Address */}
          <div>
            <label htmlFor="dofm-address" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Destination / Shipping Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="dofm-address"
              type="text"
              placeholder="e.g. 742 Evergreen Blvd, Chicago, IL 60601"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              disabled={isDone}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          {/* Row 3: Scheduled Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="dofm-date" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Scheduled Delivery Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="dofm-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                disabled={isDone}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
              />
            </div>

            <div>
              <label htmlFor="dofm-status" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Order Status</span>
                {isEditing && <DeliveryOrderStatusBadge status={status} size="sm" />}
              </label>
              <select
                id="dofm-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as DeliveryOrderStatus)}
                disabled={isDone}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
              >
                <option value="Draft">Draft (Order staged / Quotation)</option>
                <option value="Waiting">Waiting (Pending stock allocation)</option>
                <option value="Ready">Ready (Picked & Packed at dock)</option>
                <option value="Done">Done (Dispatched / Delivered - Deducts Stock)</option>
                {isEditing && <option value="Canceled">Canceled (Void Order)</option>}
              </select>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Outbound Product Items
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
              {items.map((item, idx) => {
                const prod = products.find((p) => p.id === Number(item.productId));
                const currentStock = prod ? prod.quantity : 0;
                const requestedQty = Number(item.quantity) || 0;
                const isOverStock = prod && requestedQty > currentStock && status === 'Done';

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

                    {/* Product Selector */}
                    <div className="flex-1 min-w-0">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', Number(e.target.value))}
                        disabled={isDone}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
                      >
                        <option value={0}>-- Select inventory product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name} (In Stock: {p.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Input with Available Indicator */}
                    <div className="w-full sm:w-36 shrink-0 flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 shrink-0">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        disabled={isDone}
                        className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg text-slate-900 font-mono text-right focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500 ${
                          isOverStock
                            ? 'border-rose-400 focus:ring-rose-500 text-rose-700 font-bold'
                            : 'border-slate-200 focus:ring-blue-500'
                        }`}
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
                );
              })}
            </div>

            {/* Total Units Summary */}
            <div className="p-2.5 rounded-lg bg-slate-100/80 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Total Outbound Dispatch Quantity:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {totalUnits.toLocaleString()} units
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="dofm-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes / Special Instructions <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="dofm-notes"
              rows={2}
              placeholder="e.g. Courier: FedEx Freight. Gate code #4920. Signature required upon delivery."
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
                    <span>Saving Order...</span>
                  </>
                ) : (
                  <span>{isEditing ? 'Save Changes' : 'Create Delivery Order'}</span>
                )}
              </button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
};
