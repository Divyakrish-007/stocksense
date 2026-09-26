import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  InventoryAdjustment,
  InventoryAdjustmentFormData,
  InventoryAdjustmentFilterState,
  InventoryAdjustmentsMeta,
  Product,
} from '../types';
import { inventoryAdjustmentsApi } from '../api/inventoryAdjustments';
import { productsApi } from '../api/products';
import { useToast } from '../context/ToastContext';

import { InventoryAdjustmentFilters } from '../components/inventory-adjustments/InventoryAdjustmentFilters';
import { InventoryAdjustmentsTable } from '../components/inventory-adjustments/InventoryAdjustmentsTable';
import { InventoryAdjustmentFormModal } from '../components/inventory-adjustments/InventoryAdjustmentFormModal';
import { DeleteInventoryAdjustmentModal } from '../components/inventory-adjustments/DeleteInventoryAdjustmentModal';

import { SlidersHorizontal, Plus, RefreshCw, Clock, CheckCircle2, XCircle, Layers } from 'lucide-react';

// ─── Default filter state ──────────────────────────────────────────────────────
const DEFAULT_FILTERS: InventoryAdjustmentFilterState = {
  search: '',
  status: 'All',
  warehouse: 'All',
  adjustmentType: 'All',
  dateFrom: '',
  dateTo: '',
  sortBy: 'id',
  order: 'DESC',
};

// ─── Stat Card Component ───────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: 'amber' | 'blue' | 'emerald' | 'rose';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, accent }) => {
  const accentMap = {
    amber:   'bg-amber-50 border-amber-200 text-amber-600',
    blue:    'bg-blue-50 border-blue-200 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    rose:    'bg-rose-50 border-rose-200 text-rose-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${accentMap[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  );
};

// ─── Main Page Component ───────────────────────────────────────────────────────
export const InventoryAdjustmentsPage: React.FC = () => {
  const { showToast } = useToast();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [meta, setMeta] = useState<InventoryAdjustmentsMeta | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<InventoryAdjustmentFilterState>(DEFAULT_FILTERS);

  // ── Loading / Error state ────────────────────────────────────────────────────
  const [isLoadingAdjustments, setIsLoadingAdjustments] = useState(true);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<InventoryAdjustment | null>(null);
  const [deletingAdjustment, setDeletingAdjustment] = useState<InventoryAdjustment | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // ── Fetch metadata & products once ──────────────────────────────────────────
  const fetchMetaAndProducts = useCallback(async () => {
    try {
      setIsLoadingMeta(true);
      const [metaRes, prodRes] = await Promise.all([
        inventoryAdjustmentsApi.getMeta(),
        productsApi.getProducts({ sortBy: 'name', order: 'ASC' }),
      ]);
      setMeta(metaRes);
      setProducts(prodRes.products);
    } catch (err: any) {
      console.error('Failed to load inventory adjustments meta/products:', err);
    } finally {
      setIsLoadingMeta(false);
    }
  }, []);

  // ── Fetch adjustments list (re-runs when filters change) ─────────────────────
  const fetchInventoryAdjustments = useCallback(async (activeFilters: InventoryAdjustmentFilterState) => {
    try {
      setIsLoadingAdjustments(true);
      setPageError(null);
      const { count, inventoryAdjustments: data } = await inventoryAdjustmentsApi.getInventoryAdjustments(activeFilters);
      setInventoryAdjustments(data);
      setTotalCount(count);
    } catch (err: any) {
      setPageError(err.message || 'Unable to load inventory adjustments from server.');
      setInventoryAdjustments([]);
      setTotalCount(0);
    } finally {
      setIsLoadingAdjustments(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetaAndProducts();
  }, [fetchMetaAndProducts]);

  // Debounced search / filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventoryAdjustments(filters);
    }, 350);

    return () => clearTimeout(timer);
  }, [filters, fetchInventoryAdjustments]);

  // Refresh both meta and adjustments list
  const handleFullRefresh = async () => {
    await Promise.all([fetchInventoryAdjustments(filters), fetchMetaAndProducts()]);
    showToast('info', 'Adjustments Refreshed', 'Latest inventory corrections and audit logs synchronized.');
  };

  // ── Filter helpers ──────────────────────────────────────────────────────────
  const handleFilterChange = (key: keyof InventoryAdjustmentFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const isFiltered = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.status !== 'All' ||
      filters.warehouse !== 'All' ||
      filters.adjustmentType !== 'All' ||
      filters.dateFrom !== '' ||
      filters.dateTo !== '' ||
      filters.sortBy !== 'id'
    );
  }, [filters]);

  // ── Modal Handlers ──────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingAdjustment(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (adjustment: InventoryAdjustment) => {
    setEditingAdjustment(adjustment);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (adjustment: InventoryAdjustment) => {
    setDeletingAdjustment(adjustment);
    setIsDeleteOpen(true);
  };

  // Create or Update Inventory Adjustment
  const handleFormSubmit = async (formData: InventoryAdjustmentFormData) => {
    if (editingAdjustment) {
      const res = await inventoryAdjustmentsApi.updateInventoryAdjustment(editingAdjustment.id, formData);
      showToast('success', 'Adjustment Updated', res.message || `Adjustment ${res.inventoryAdjustment.reference} updated.`);
    } else {
      const res = await inventoryAdjustmentsApi.createInventoryAdjustment(formData);
      showToast('success', 'Adjustment Created', res.message || `Adjustment ${res.inventoryAdjustment.reference} logged.`);
    }
    // Refresh list, meta, and products (stock quantities reconciled if status was Done)
    await Promise.all([fetchInventoryAdjustments(filters), fetchMetaAndProducts()]);
  };

  // Confirm delete adjustment
  const handleDeleteConfirm = async (id: number) => {
    const res = await inventoryAdjustmentsApi.deleteInventoryAdjustment(id);
    showToast('success', 'Adjustment Deleted', res.message || 'The adjustment has been removed.');
    await Promise.all([fetchInventoryAdjustments(filters), fetchMetaAndProducts()]);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Inventory Adjustments & Stock Audits
            </h1>
            <p className="text-xs text-slate-500">
              Reconcile physical cycle counts, write-offs, shrinkage, and stock corrections with live balances
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleFullRefresh}
            disabled={isLoadingAdjustments || isLoadingMeta}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            title="Refresh inventory adjustments and stock balances"
            aria-label="Refresh inventory adjustments"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingAdjustments || isLoadingMeta ? 'animate-spin text-amber-600' : ''}`}
            />
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Adjustment</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {pageError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{pageError}</span>
          <button
            onClick={() => fetchInventoryAdjustments(filters)}
            className="font-semibold underline hover:no-underline ml-4 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Total Adjustments"
          value={isLoadingMeta ? '…' : (meta?.stats?.total ?? 0)}
          sub="All logged audit reconciliations"
          icon={<Layers className="w-5 h-5" />}
          accent="amber"
        />
        <StatCard
          label="Pending Counts"
          value={isLoadingMeta ? '…' : (meta?.stats?.pending ?? 0)}
          sub="Draft, Waiting & Ready"
          icon={<Clock className="w-5 h-5" />}
          accent="blue"
        />
        <StatCard
          label="Reconciled & Done"
          value={isLoadingMeta ? '…' : (meta?.stats?.done ?? 0)}
          sub="Reconciled with SQLite stock"
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="emerald"
        />
        <StatCard
          label="Canceled Audits"
          value={isLoadingMeta ? '…' : (meta?.stats?.canceled ?? 0)}
          sub="Void adjustment logs"
          icon={<XCircle className="w-5 h-5" />}
          accent="rose"
        />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <InventoryAdjustmentFilters
        filters={filters}
        warehouses={meta?.warehouses || []}
        totalCount={totalCount}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* ── Adjustments Table ───────────────────────────────────────────────── */}
      <InventoryAdjustmentsTable
        inventoryAdjustments={inventoryAdjustments}
        isLoading={isLoadingAdjustments}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        onAddNew={handleOpenCreate}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* ── Form Modal (Create / Edit / View) ───────────────────────────────── */}
      <InventoryAdjustmentFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAdjustment(null);
        }}
        onSubmit={handleFormSubmit}
        initialAdjustment={editingAdjustment}
        warehouses={meta?.warehouses || []}
        availableProducts={products}
        reasons={meta?.reasons || []}
      />

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      <DeleteInventoryAdjustmentModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingAdjustment(null);
        }}
        adjustment={deletingAdjustment}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
