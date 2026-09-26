import React, { useState, useEffect, useCallback } from 'react';
import type { Supplier, SupplierFilterState, SuppliersMeta } from '../types';
import { suppliersApi } from '../api/suppliers';
import { SupplierFilters } from '../components/suppliers/SupplierFilters';
import { SuppliersTable } from '../components/suppliers/SuppliersTable';
import { SupplierFormModal } from '../components/suppliers/SupplierFormModal';
import { DeleteSupplierModal } from '../components/suppliers/DeleteSupplierModal';
import { useToast } from '../context/ToastContext';
import {
  Building2,
  Plus,
  CheckCircle2,
  XCircle,
  PackageCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const SuppliersPage: React.FC = () => {
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [meta, setMeta] = useState<SuppliersMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState<SupplierFilterState>({
    search: '',
    status: 'All',
    city: 'All',
    sortBy: 'id',
    order: 'ASC',
  });

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Fetch Metadata & Stats
  const fetchMeta = useCallback(async () => {
    try {
      const metaData = await suppliersApi.getMeta();
      setMeta(metaData);
    } catch (err: any) {
      console.error('Failed to fetch suppliers metadata:', err);
    }
  }, []);

  // Fetch Suppliers List
  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await suppliersApi.getSuppliers(filters);
      setSuppliers(data.suppliers);
    } catch (err: any) {
      console.error('Failed to fetch suppliers:', err);
      setError(err?.message || 'Failed to connect to StockSense server');
      showToast('error', 'Fetch Error', 'Failed to load suppliers list');
    } finally {
      setIsLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Handler for filter changes
  const handleFilterChange = (key: keyof SupplierFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'All',
      city: 'All',
      sortBy: 'id',
      order: 'ASC',
    });
  };

  // Modal triggers
  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setFormModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormModalOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (id: number) => {
    try {
      await suppliersApi.deleteSupplier(id);
      showToast('success', 'Supplier Deleted', 'Supplier removed from directory');
      fetchSuppliers();
      fetchMeta();
    } catch (err: any) {
      throw err;
    }
  };

  const handleSaved = () => {
    fetchSuppliers();
    fetchMeta();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Suppliers Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage vendor directory, contact records, payment terms, and procurement history
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleAddSupplier}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Suppliers */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Directory
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {meta?.stats.total ?? suppliers.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">registered vendors</span>
          </div>
        </div>

        {/* Card 2: Active Suppliers */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Active Vendors
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {meta?.stats.active ?? 0}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              {meta?.stats.total
                ? `${Math.round(((meta.stats.active || 0) / meta.stats.total) * 100)}% active`
                : '100%'}
            </span>
          </div>
        </div>

        {/* Card 3: Inactive Suppliers */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Inactive Vendors
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {meta?.stats.inactive ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">archived/paused</span>
          </div>
        </div>

        {/* Card 4: Total Orders Associated */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Procurement Orders
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {meta?.stats.totalOrders ?? 0}
            </span>
            <span className="text-xs text-indigo-600 font-medium">linked PO records</span>
          </div>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchSuppliers}
            className="inline-flex items-center gap-1 font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <SupplierFilters
        filters={filters}
        cities={meta?.cities || []}
        totalCount={suppliers.length}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Suppliers Table */}
      <SuppliersTable
        suppliers={suppliers}
        isLoading={isLoading}
        onEdit={handleEditSupplier}
        onDelete={handleDeleteSupplier}
        onAddClick={handleAddSupplier}
      />

      {/* Supplier Create / Edit Modal */}
      <SupplierFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSaved={handleSaved}
        supplier={selectedSupplier}
      />

      {/* Delete Confirmation Modal */}
      <DeleteSupplierModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        supplier={supplierToDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default SuppliersPage;
