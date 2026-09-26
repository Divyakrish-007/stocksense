import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Receipt, ReceiptFormData, ReceiptFilterState, ReceiptsMeta, Product } from '../types';
import { receiptsApi } from '../api/receipts';
import { productsApi } from '../api/products';
import { useToast } from '../context/ToastContext';

import { ReceiptFilters } from '../components/receipts/ReceiptFilters';
import { ReceiptsTable } from '../components/receipts/ReceiptsTable';
import { ReceiptFormModal } from '../components/receipts/ReceiptFormModal';
import { CancelReceiptModal } from '../components/receipts/CancelReceiptModal';

import { ClipboardList, Plus, RefreshCw, Clock, CheckCircle2, XCircle, Layers } from 'lucide-react';

// ─── Default filter state ──────────────────────────────────────────────────────
const DEFAULT_FILTERS: ReceiptFilterState = {
  search: '',
  status: 'All',
  warehouse: 'All',
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
  accent: 'blue' | 'amber' | 'emerald' | 'rose';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, accent }) => {
  const accentMap = {
    blue:    'bg-blue-50 border-blue-200 text-blue-600',
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
export const ReceiptsPage: React.FC = () => {
  const { showToast } = useToast();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [meta, setMeta] = useState<ReceiptsMeta | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<ReceiptFilterState>(DEFAULT_FILTERS);

  // ── Loading / Error state ────────────────────────────────────────────────────
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(true);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [cancelingReceipt, setCancelingReceipt] = useState<Receipt | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // ── Fetch metadata & products once ──────────────────────────────────────────
  const fetchMetaAndProducts = useCallback(async () => {
    try {
      setIsLoadingMeta(true);
      const [metaRes, prodRes] = await Promise.all([
        receiptsApi.getMeta(),
        productsApi.getProducts({ sortBy: 'name', order: 'ASC' }),
      ]);
      setMeta(metaRes);
      setProducts(prodRes.products);
    } catch (err: any) {
      console.error('Failed to load receipts meta/products:', err);
    } finally {
      setIsLoadingMeta(false);
    }
  }, []);

  // ── Fetch receipts list (re-runs when filters change) ────────────────────────
  const fetchReceipts = useCallback(async (activeFilters: ReceiptFilterState) => {
    try {
      setIsLoadingReceipts(true);
      setPageError(null);
      const { count, receipts: data } = await receiptsApi.getReceipts(activeFilters);
      setReceipts(data);
      setTotalCount(count);
    } catch (err: any) {
      setPageError(err.message || 'Unable to load inbound receipts from server.');
      setReceipts([]);
      setTotalCount(0);
    } finally {
      setIsLoadingReceipts(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetaAndProducts();
  }, [fetchMetaAndProducts]);

  // Debounced search / filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReceipts(filters);
    }, 350);

    return () => clearTimeout(timer);
  }, [filters, fetchReceipts]);

  // Refresh both meta and receipts list
  const handleFullRefresh = async () => {
    await Promise.all([fetchReceipts(filters), fetchMetaAndProducts()]);
    showToast('info', 'Receipts Refreshed', 'Latest inventory shipments synchronized.');
  };

  // ── Filter helpers ──────────────────────────────────────────────────────────
  const handleFilterChange = (key: keyof ReceiptFilterState, value: string) => {
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
      filters.dateFrom !== '' ||
      filters.dateTo !== '' ||
      filters.sortBy !== 'id'
    );
  }, [filters]);

  // ── Modal Handlers ──────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingReceipt(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setIsFormOpen(true);
  };

  const handleOpenCancel = (receipt: Receipt) => {
    setCancelingReceipt(receipt);
    setIsCancelOpen(true);
  };

  // Create or Update Receipt
  const handleFormSubmit = async (formData: ReceiptFormData) => {
    if (editingReceipt) {
      const res = await receiptsApi.updateReceipt(editingReceipt.id, formData);
      showToast('success', 'Receipt Updated', res.message || `Receipt ${res.receipt.reference} updated successfully.`);
    } else {
      const res = await receiptsApi.createReceipt(formData);
      showToast('success', 'Receipt Created', res.message || `Inbound receipt ${res.receipt.reference} scheduled.`);
    }
    // Refresh list, meta, and products (stock quantities might have updated if Done)
    await Promise.all([fetchReceipts(filters), fetchMetaAndProducts()]);
  };

  // Confirm cancel/delete receipt
  const handleCancelConfirm = async (id: number) => {
    const res = await receiptsApi.deleteReceipt(id);
    showToast('success', 'Receipt Canceled', res.message || 'The receipt record has been canceled and removed.');
    await Promise.all([fetchReceipts(filters), fetchMetaAndProducts()]);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Inbound Receipts
            </h1>
            <p className="text-xs text-slate-500">
              Schedule, track, and receive vendor shipments into central warehouse inventory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleFullRefresh}
            disabled={isLoadingReceipts || isLoadingMeta}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            title="Refresh receipts and inventory"
            aria-label="Refresh receipts"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingReceipts || isLoadingMeta ? 'animate-spin text-blue-600' : ''}`}
            />
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Receipt</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {pageError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{pageError}</span>
          <button
            onClick={() => fetchReceipts(filters)}
            className="font-semibold underline hover:no-underline ml-4 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Total Receipts"
          value={isLoadingMeta ? '…' : (meta?.stats?.total ?? 0)}
          sub="All logged shipments"
          icon={<Layers className="w-5 h-5" />}
          accent="blue"
        />
        <StatCard
          label="Pending Intake"
          value={isLoadingMeta ? '…' : (meta?.stats?.pending ?? 0)}
          sub="Draft, Waiting & Ready"
          icon={<Clock className="w-5 h-5" />}
          accent="amber"
        />
        <StatCard
          label="Received & Stocked"
          value={isLoadingMeta ? '…' : (meta?.stats?.done ?? 0)}
          sub="Credited to SQLite inventory"
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="emerald"
        />
        <StatCard
          label="Canceled Receipts"
          value={isLoadingMeta ? '…' : (meta?.stats?.canceled ?? 0)}
          sub="Void shipments"
          icon={<XCircle className="w-5 h-5" />}
          accent="rose"
        />
      </div>

      {/* ── Receipts Filter Bar ─────────────────────────────────────────────── */}
      <ReceiptFilters
        filters={filters}
        warehouses={meta?.warehouses || []}
        totalCount={totalCount}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* ── Receipts Table ──────────────────────────────────────────────────── */}
      <ReceiptsTable
        receipts={receipts}
        isLoading={isLoadingReceipts}
        onEdit={handleOpenEdit}
        onCancel={handleOpenCancel}
        onAddNew={handleOpenCreate}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* ── Form Modal (Create / Edit) ──────────────────────────────────────── */}
      <ReceiptFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingReceipt(null);
        }}
        onSubmit={handleFormSubmit}
        initialReceipt={editingReceipt}
        warehouses={meta?.warehouses || []}
        availableProducts={products}
      />

      {/* ── Cancel Confirmation Modal ───────────────────────────────────────── */}
      <CancelReceiptModal
        isOpen={isCancelOpen}
        onClose={() => {
          setIsCancelOpen(false);
          setCancelingReceipt(null);
        }}
        receipt={cancelingReceipt}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
};
