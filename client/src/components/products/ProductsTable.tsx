import React from 'react';
import type { Product } from '../../types';
import { ProductStockBadge, StockLevelIndicator } from './ProductStockBadge';
import { Edit2, Trash2, PackageX, Warehouse as WarehouseIcon, Plus } from 'lucide-react';

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAddNew: () => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  isLoading,
  onEdit,
  onDelete,
  onAddNew,
  onResetFilters,
  isFiltered,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th scope="col" className="px-5 py-3">SKU / Reference</th>
              <th scope="col" className="px-4 py-3">Product Name & Category</th>
              <th scope="col" className="px-4 py-3">Stock Level & Safety Min</th>
              <th scope="col" className="px-4 py-3">Stock Status</th>
              <th scope="col" className="px-4 py-3 text-right">Unit Price</th>
              <th scope="col" className="px-4 py-3 text-right">Valuation</th>
              <th scope="col" className="px-4 py-3">Assigned Facility</th>
              <th scope="col" className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-medium">
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-40 bg-slate-200 rounded mb-1"></div><div className="h-3 w-20 bg-slate-100 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-28 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-5 w-20 bg-slate-200 rounded-full"></div></td>
                  <td className="px-4 py-4 text-right"><div className="h-4 w-14 bg-slate-200 rounded ml-auto"></div></td>
                  <td className="px-4 py-4 text-right"><div className="h-4 w-16 bg-slate-200 rounded ml-auto"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                  <td className="px-5 py-4 text-right"><div className="h-6 w-14 bg-slate-200 rounded ml-auto"></div></td>
                </tr>
              ))
            ) : products.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <PackageX className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No inventory products found</p>
                    <p className="text-xs text-slate-500 mt-1 text-center">
                      {isFiltered
                        ? 'No products match your selected filter criteria. Try resetting the filters or add a new SKU.'
                        : 'Your master product catalog is currently empty. Get started by adding your first product.'}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      {isFiltered && (
                        <button
                          onClick={onResetFilters}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                      <button
                        onClick={onAddNew}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Product</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              // Product Rows
              products.map((p) => {
                const lineValuation = p.quantity * p.unit_price;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* SKU Code */}
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                        {p.sku}
                      </span>
                    </td>

                    {/* Name & Category */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 text-xs">{p.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {p.category}
                        </span>
                      </div>
                    </td>

                    {/* Stock Level & Visual Indicator */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StockLevelIndicator
                        quantity={p.quantity}
                        minStockLevel={p.min_stock_level}
                      />
                    </td>

                    {/* Stock Status Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <ProductStockBadge status={p.status} size="sm" />
                    </td>

                    {/* Unit Price */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-slate-700">
                      ${p.unit_price.toFixed(2)}
                    </td>

                    {/* Total Line Valuation */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                      ${lineValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Assigned Warehouse Location */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700" title={p.warehouse_location || p.warehouse_code}>
                        <WarehouseIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{p.warehouse_code}</span>
                        {p.warehouse_name && (
                          <span className="text-[11px] text-slate-500 hidden xl:inline truncate max-w-[120px]">
                            • {p.warehouse_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Product"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDelete(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Product"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
        <span>Showing {products.length} products in current view</span>
        <span className="text-[11px] text-slate-600">
          Real-time synchronization with central warehouse SQLite database
        </span>
      </div>
    </div>
  );
};
