import React from 'react';
import type { PurchaseOrderFilterState, Warehouse, Supplier } from '../../types';
import { Search, RotateCcw, Filter, ArrowUpDown } from 'lucide-react';

interface PurchaseOrderFiltersProps {
  filters: PurchaseOrderFilterState;
  warehouses: Warehouse[];
  suppliers: Pick<Supplier, 'id' | 'code' | 'name'>[];
  totalCount: number;
  onChange: (key: keyof PurchaseOrderFilterState, value: string) => void;
  onReset: () => void;
}

export const PurchaseOrderFilters: React.FC<PurchaseOrderFiltersProps> = ({
  filters,
  warehouses,
  suppliers,
  totalCount,
  onChange,
  onReset,
}) => {
  const isFiltered =
    filters.search !== '' ||
    filters.status !== 'All' ||
    filters.warehouse !== 'All' ||
    filters.supplier !== 'All' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.sortBy !== 'id';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Search Bar & Stats Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800 tracking-tight">
            Filter & Search Purchase Orders
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
            {totalCount} {totalCount === 1 ? 'order' : 'orders'} matching
          </span>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by PO #, supplier name, notes..."
            value={filters.search}
            onChange={(e) => onChange('search', e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onChange('search', '')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 font-medium"
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
        {/* Supplier */}
        <div>
          <label htmlFor="filter-po-supplier" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Supplier Vendor
          </label>
          <select
            id="filter-po-supplier"
            value={filters.supplier}
            onChange={(e) => onChange('supplier', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="All">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        {/* Destination Warehouse */}
        <div>
          <label htmlFor="filter-po-wh" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Destination Facility
          </label>
          <select
            id="filter-po-wh"
            value={filters.warehouse}
            onChange={(e) => onChange('warehouse', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="All">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.code} value={w.code}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* PO Status */}
        <div>
          <label htmlFor="filter-po-status" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Order Status
          </label>
          <select
            id="filter-po-status"
            value={filters.status}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft (Drafting)</option>
            <option value="Waiting">Waiting Approval</option>
            <option value="Ready">Ready / Dispatched</option>
            <option value="Done">Done (Completed Intake)</option>
            <option value="Canceled">Canceled</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label htmlFor="filter-po-date-from" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Date From
          </label>
          <input
            id="filter-po-date-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange('dateFrom', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Sorting */}
        <div>
          <label htmlFor="filter-po-sort" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Sort By</span>
            <button
              type="button"
              onClick={() => onChange('order', filters.order === 'ASC' ? 'DESC' : 'ASC')}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              title="Toggle sorting direction"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>{filters.order === 'ASC' ? 'Asc' : 'Desc'}</span>
            </button>
          </label>
          <select
            id="filter-po-sort"
            value={filters.sortBy}
            onChange={(e) => onChange('sortBy', e.target.value as any)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="id">Default (Newest First)</option>
            <option value="reference">PO Reference</option>
            <option value="supplier_name">Supplier Name</option>
            <option value="order_date">Order Date</option>
            <option value="expected_date">Expected Date</option>
            <option value="grand_total">Total Value ($)</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Active Filter Chips & Reset */}
      {isFiltered && (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mr-1">
              Active Filters:
            </span>
            {filters.search && (
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs border border-slate-200">
                Search: "{filters.search}"
              </span>
            )}
            {filters.supplier !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                Supplier Selected
              </span>
            )}
            {filters.warehouse !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-xs border border-teal-200">
                Facility: {filters.warehouse}
              </span>
            )}
            {filters.status !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs border border-amber-200">
                Status: {filters.status}
              </span>
            )}
            {filters.dateFrom && (
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">
                From: {filters.dateFrom}
              </span>
            )}
            {filters.sortBy !== 'id' && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs border border-purple-200">
                Sorted by: {filters.sortBy} ({filters.order})
              </span>
            )}
          </div>

          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};
