import React, { useState, useEffect } from 'react';
import type { Product, ProductFormData, Warehouse } from '../../types';
import { Modal } from '../common/Modal';
import { ProductStockBadge } from './ProductStockBadge';
import { Loader2, DollarSign, Package, AlertCircle } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  initialProduct?: Product | null;
  warehouses: Warehouse[];
  existingCategories: string[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialProduct,
  warehouses,
  existingCategories,
}) => {
  const isEditing = Boolean(initialProduct);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [warehouseCode, setWarehouseCode] = useState('');
  const [quantity, setQuantity] = useState<number | string>(0);
  const [minStockLevel, setMinStockLevel] = useState<number | string>(10);
  const [unitPrice, setUnitPrice] = useState<number | string>(0.0);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Pre-fill fields when modal opens or initialProduct changes
  useEffect(() => {
    if (initialProduct) {
      setSku(initialProduct.sku);
      setName(initialProduct.name);
      setCategory(initialProduct.category);
      setIsCustomCategory(false);
      setCustomCategory('');
      setWarehouseCode(initialProduct.warehouse_code);
      setQuantity(initialProduct.quantity);
      setMinStockLevel(initialProduct.min_stock_level);
      setUnitPrice(initialProduct.unit_price);
    } else {
      // Defaults for new product
      setSku('');
      setName('');
      setCategory(existingCategories[0] || 'Electronics');
      setIsCustomCategory(false);
      setCustomCategory('');
      setWarehouseCode(warehouses[0]?.code || 'WH-MAIN');
      setQuantity(0);
      setMinStockLevel(10);
      setUnitPrice(0.0);
    }
    setFormError('');
  }, [initialProduct, isOpen, existingCategories, warehouses]);

  // Real-time stock status preview
  const numQty = Number(quantity) || 0;
  const numMinStock = Number(minStockLevel) || 0;
  const numUnitPrice = Number(unitPrice) || 0;

  const previewStatus =
    numQty === 0 ? 'Out of Stock' : numQty <= numMinStock ? 'Low Stock' : 'In Stock';
  const previewValuation = Math.round(numQty * numUnitPrice * 100) / 100;

  const validate = (): string | null => {
    if (!sku.trim()) return 'SKU / Product reference code is required.';
    if (sku.trim().length < 2) return 'SKU must be at least 2 characters long.';
    if (!name.trim()) return 'Product name is required.';
    if (name.trim().length < 2) return 'Product name must be at least 2 characters.';
    
    const finalCategory = isCustomCategory ? customCategory.trim() : category.trim();
    if (!finalCategory) return 'Product category is required.';

    if (!warehouseCode) return 'Please assign a storage warehouse.';

    if (isNaN(numQty) || numQty < 0) return 'Stock quantity must be a non-negative number.';
    if (isNaN(numMinStock) || numMinStock < 0) return 'Minimum stock level must be a non-negative number.';
    if (isNaN(numUnitPrice) || numUnitPrice < 0) return 'Unit price must be a non-negative number.';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() : category.trim();

    setIsLoading(true);
    try {
      await onSubmit({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        category: finalCategory,
        quantity: numQty,
        min_stock_level: numMinStock,
        unit_price: numUnitPrice,
        warehouse_code: warehouseCode,
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product. Please verify inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Product: ${initialProduct?.sku}` : 'Add New Inventory Product'}
      subtitle={
        isEditing
          ? 'Update SKU specifications, stock levels, valuation, or facility assignment'
          : 'Register a new stock keeping unit (SKU) into the central warehouse database'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Notification */}
        {formError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* SKU Field */}
          <div>
            <label htmlFor="prod-sku" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              SKU / Reference Code *
            </label>
            <input
              id="prod-sku"
              type="text"
              required
              placeholder="e.g. SKU-ELC-099"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
            />
            <span className="text-[10px] text-slate-600 mt-0.5 block">Unique inventory reference</span>
          </div>

          {/* Product Name */}
          <div>
            <label htmlFor="prod-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Product Name *
            </label>
            <input
              id="prod-name"
              type="text"
              required
              placeholder="e.g. Precision Pressure Sensor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <span className="text-[10px] text-slate-600 mt-0.5 block">Catalog descriptive name</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="prod-cat" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Category *
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
              >
                {isCustomCategory ? 'Pick existing' : '+ Custom category'}
              </button>
            </div>

            {isCustomCategory ? (
              <input
                type="text"
                required
                placeholder="Type new category..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <select
                id="prod-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {existingCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Assigned Warehouse Location */}
          <div>
            <label htmlFor="prod-wh" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Storage Facility / Warehouse *
            </label>
            <select
              id="prod-wh"
              value={warehouseCode}
              onChange={(e) => setWarehouseCode(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {warehouses.map((wh) => (
                <option key={wh.code} value={wh.code}>
                  {wh.code} - {wh.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-600 mt-0.5 block">Primary physical storage hub</span>
          </div>
        </div>

        {/* Quantities & Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* Stock Quantity */}
          <div>
            <label htmlFor="prod-qty" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Stock Quantity *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Package className="w-4 h-4" />
              </div>
              <input
                id="prod-qty"
                type="number"
                min="0"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-[10px] text-slate-600 mt-0.5 block">Available on shelf</span>
          </div>

          {/* Min Stock Alert Level */}
          <div>
            <label htmlFor="prod-min" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Safety Stock Threshold *
            </label>
            <input
              id="prod-min"
              type="number"
              min="0"
              step="1"
              required
              value={minStockLevel}
              onChange={(e) => setMinStockLevel(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[10px] text-slate-600 mt-0.5 block">Reorder trigger quantity</span>
          </div>

          {/* Unit Price */}
          <div>
            <label htmlFor="prod-price" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Unit Price ($ USD) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                id="prod-price"
                type="number"
                min="0"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-[10px] text-slate-600 mt-0.5 block">Per unit catalog valuation</span>
          </div>
        </div>

        {/* Live Calculation Preview Banner */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Computed Status:</span>
            <ProductStockBadge status={previewStatus} size="sm" />
          </div>
          <div className="text-xs text-slate-600">
            Total Line Valuation:{' '}
            <span className="font-bold text-slate-900 font-mono">
              ${previewValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <span>{isEditing ? 'Save Product Changes' : 'Add Product to Inventory'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
