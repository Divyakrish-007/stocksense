import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  InternalTransfer,
  InternalTransferFormData,
  InternalTransferFilterState,
  InternalTransfersMeta,
  Product,
} from '../types';
import { internalTransfersApi } from '../api/internalTransfers';
import { productsApi } from '../api/products';
import { useToast } from '../context/ToastContext';

import { InternalTransferFilters } from '../components/internal-transfers/InternalTransferFilters';
import { InternalTransfersTable } from '../components/internal-transfers/InternalTransfersTable';
import { InternalTransferFormModal } from '../components/internal-transfers/InternalTransferFormModal';
import { DeleteInternalTransferModal } from '../components/internal-transfers/DeleteInternalTransferModal';

import { ArrowLeftRight, Plus, RefreshCw, Clock, CheckCircle2, XCircle, Layers } from 'lucide-react';

// ─── Default filter state ──────────────────────────────────────────────────────
const DEFAULT_FILTERS: InternalTransferFilterState = {
  search: '',
  status: 'All',
  sourceWarehouse: 'All',
  destWarehouse: 'All',
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
  accent: 'violet' | 'amber' | 'emerald' | 'rose';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, accent }) => {
  const accentMap = {
    violet:  'bg-violet-50 border-violet-200 text-violet-600',
    amber:   'bg-amber-50 border-amber-200 text-amber-600',
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
export const InternalTransfersPage: React.FC = () => {
  const { showToast } = useToast();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [internalTransfers, setInternalTransfers] = useState<InternalTransfer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [meta, setMeta] = useState<InternalTransfersMeta | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<InternalTransferFilterState>(DEFAULT_FILTERS);

  // ── Loading / Error state ────────────────────────────────────────────────────
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(true);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<InternalTransfer | null>(null);
  const [deletingTransfer, setDeletingTransfer] = useState<InternalTransfer | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // ── Fetch metadata & products once ──────────────────────────────────────────
  const fetchMetaAndProducts = useCallback(async () => {
    try {
      setIsLoadingMeta(true);
      const [metaRes, prodRes] = await Promise.all([
        internalTransfersApi.getMeta(),
        productsApi.getProducts({ sortBy: 'name', order: 'ASC' }),
      ]);
      setMeta(metaRes);
      setProducts(prodRes.products);
    } catch (err: any) {
      console.error('Failed to load internal transfers meta/products:', err);
    } finally {
      setIsLoadingMeta(false);
    }
  }, []);

  // ── Fetch internal transfers list (re-runs when filters change) ─────────────
  const fetchInternalTransfers = useCallback(async (activeFilters: InternalTransferFilterState) => {
    try {
      setIsLoadingTransfers(true);
      setPageError(null);
      const { count, internalTransfers: data } = await internalTransfersApi.getInternalTransfers(activeFilters);
      setInternalTransfers(data);
      setTotalCount(count);
    } catch (err: any) {
      setPageError(err.message || 'Unable to load internal transfers from server.');
      setInternalTransfers([]);
      setTotalCount(0);
    } finally {
      setIsLoadingTransfers(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetaAndProducts();
  }, [fetchMetaAndProducts]);

  // Debounced search / filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInternalTransfers(filters);
    }, 350);

    return () => clearTimeout(timer);
  }, [filters, fetchInternalTransfers]);

  // Refresh both meta and internal transfers list
  const handleFullRefresh = async () => {
    await Promise.all([fetchInternalTransfers(filters), fetchMetaAndProducts()]);
    showToast('info', 'Transfers Refreshed', 'Latest inter-warehouse transfers synchronized.');
  };

  // ── Filter helpers ──────────────────────────────────────────────────────────
  const handleFilterChange = (key: keyof InternalTransferFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const isFiltered = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.status !== 'All' ||
      filters.sourceWarehouse !== 'All' ||
      filters.destWarehouse !== 'All' ||
      filters.dateFrom !== '' ||
      filters.dateTo !== '' ||
      filters.sortBy !== 'id'
    );
  }, [filters]);

  // ── Modal Handlers ──────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingTransfer(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (transfer: InternalTransfer) => {
    setEditingTransfer(transfer);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (transfer: InternalTransfer) => {
    setDeletingTransfer(transfer);
    setIsDeleteOpen(true);
  };

  // Create or Update Internal Transfer
  const handleFormSubmit = async (formData: InternalTransferFormData) => {
    if (editingTransfer) {
      const res = await internalTransfersApi.updateInternalTransfer(editingTransfer.id, formData);
      showToast('success', 'Transfer Updated', res.message || `Internal transfer ${res.internalTransfer.reference} updated successfully.`);
    } else {
      const res = await internalTransfersApi.createInternalTransfer(formData);
      showToast('success', 'Transfer Created', res.message || `Internal transfer ${res.internalTransfer.reference} created.`);
    }
    // Refresh list, meta, and products (stock quantities moved if status was Done)
    await Promise.all([fetchInternalTransfers(filters), fetchMetaAndProducts()]);
  };

  // Confirm delete internal transfer
  const handleDeleteConfirm = async (id: number) => {
    const res = await internalTransfersApi.deleteInternalTransfer(id);
    showToast('success', 'Transfer Deleted', res.message || 'The internal transfer has been deleted.');
    await Promise.all([fetchInternalTransfers(filters), fetchMetaAndProducts()]);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Internal Stock Transfers
            </h1>
            <p className="text-xs text-slate-500">
              Transfer products between warehouses, depots, and storage locations with live balance verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleFullRefresh}
            disabled={isLoadingTransfers || isLoadingMeta}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            title="Refresh internal transfers and stock"
            aria-label="Refresh internal transfers"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingTransfers || isLoadingMeta ? 'animate-spin text-violet-600' : ''}`}
            />
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Transfer</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {pageError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{pageError}</span>
          <button
            onClick={() => fetchInternalTransfers(filters)}
            className="font-semibold underline hover:no-underline ml-4 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Total Transfers"
          value={isLoadingMeta ? '…' : (meta?.stats?.total ?? 0)}
          sub="All logged warehouse movements"
          icon={<Layers className="w-5 h-5" />}
          accent="violet"
        />
        <StatCard
          label="Pending Movements"
          value={isLoadingMeta ? '…' : (meta?.stats?.pending ?? 0)}
          sub="Draft, Waiting & Ready"
          icon={<Clock className="w-5 h-5" />}
          accent="amber"
        />
        <StatCard
          label="Completed Transfers"
          value={isLoadingMeta ? '…' : (meta?.stats?.done ?? 0)}
          sub="Moved & synced across locations"
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="emerald"
        />
        <StatCard
          label="Canceled Transfers"
          value={isLoadingMeta ? '…' : (meta?.stats?.canceled ?? 0)}
          sub="Void transfer operations"
          icon={<XCircle className="w-5 h-5" />}
          accent="rose"
        />
      </div>

      {/* ── Internal Transfer Filter Bar ────────────────────────────────────── */}
      <InternalTransferFilters
        filters={filters}
        warehouses={meta?.warehouses || []}
        totalCount={totalCount}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* ── Internal Transfers Table ────────────────────────────────────────── */}
      <InternalTransfersTable
        internalTransfers={internalTransfers}
        isLoading={isLoadingTransfers}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        onAddNew={handleOpenCreate}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* ── Form Modal (Create / Edit) ──────────────────────────────────────── */}
      <InternalTransferFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTransfer(null);
        }}
        onSubmit={handleFormSubmit}
        initialTransfer={editingTransfer}
        warehouses={meta?.warehouses || []}
        availableProducts={products}
      />

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      <DeleteInternalTransferModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingTransfer(null);
        }}
        transfer={deletingTransfer}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
