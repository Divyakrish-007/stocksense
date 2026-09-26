import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { DeliveryOrder, DeliveryOrderFormData, DeliveryOrderFilterState, DeliveryOrdersMeta, Product } from '../types';
import { deliveryOrdersApi } from '../api/deliveryOrders';
import { productsApi } from '../api/products';
import { useToast } from '../context/ToastContext';

import { DeliveryOrderFilters } from '../components/delivery-orders/DeliveryOrderFilters';
import { DeliveryOrdersTable } from '../components/delivery-orders/DeliveryOrdersTable';
import { DeliveryOrderFormModal } from '../components/delivery-orders/DeliveryOrderFormModal';
import { CancelDeliveryOrderModal } from '../components/delivery-orders/CancelDeliveryOrderModal';

import { Truck, Plus, RefreshCw, Clock, CheckCircle2, XCircle, Layers } from 'lucide-react';

// ─── Default filter state ──────────────────────────────────────────────────────
const DEFAULT_FILTERS: DeliveryOrderFilterState = {
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
export const DeliveryOrdersPage: React.FC = () => {
  const { showToast } = useToast();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [meta, setMeta] = useState<DeliveryOrdersMeta | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<DeliveryOrderFilterState>(DEFAULT_FILTERS);

  // ── Loading / Error state ────────────────────────────────────────────────────
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<DeliveryOrder | null>(null);
  const [cancelingOrder, setCancelingOrder] = useState<DeliveryOrder | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // ── Fetch metadata & products once ──────────────────────────────────────────
  const fetchMetaAndProducts = useCallback(async () => {
    try {
      setIsLoadingMeta(true);
      const [metaRes, prodRes] = await Promise.all([
        deliveryOrdersApi.getMeta(),
        productsApi.getProducts({ sortBy: 'name', order: 'ASC' }),
      ]);
      setMeta(metaRes);
      setProducts(prodRes.products);
    } catch (err: any) {
      console.error('Failed to load delivery orders meta/products:', err);
    } finally {
      setIsLoadingMeta(false);
    }
  }, []);

  // ── Fetch delivery orders list (re-runs when filters change) ────────────────
  const fetchDeliveryOrders = useCallback(async (activeFilters: DeliveryOrderFilterState) => {
    try {
      setIsLoadingOrders(true);
      setPageError(null);
      const { count, deliveryOrders: data } = await deliveryOrdersApi.getDeliveryOrders(activeFilters);
      setDeliveryOrders(data);
      setTotalCount(count);
    } catch (err: any) {
      setPageError(err.message || 'Unable to load delivery orders from server.');
      setDeliveryOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetaAndProducts();
  }, [fetchMetaAndProducts]);

  // Debounced search / filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeliveryOrders(filters);
    }, 350);

    return () => clearTimeout(timer);
  }, [filters, fetchDeliveryOrders]);

  // Refresh both meta and delivery orders list
  const handleFullRefresh = async () => {
    await Promise.all([fetchDeliveryOrders(filters), fetchMetaAndProducts()]);
    showToast('info', 'Orders Refreshed', 'Latest outbound delivery orders synchronized.');
  };

  // ── Filter helpers ──────────────────────────────────────────────────────────
  const handleFilterChange = (key: keyof DeliveryOrderFilterState, value: string) => {
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
    setEditingOrder(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (order: DeliveryOrder) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleOpenCancel = (order: DeliveryOrder) => {
    setCancelingOrder(order);
    setIsCancelOpen(true);
  };

  // Create or Update Delivery Order
  const handleFormSubmit = async (formData: DeliveryOrderFormData) => {
    if (editingOrder) {
      const res = await deliveryOrdersApi.updateDeliveryOrder(editingOrder.id, formData);
      showToast('success', 'Order Updated', res.message || `Delivery order ${res.deliveryOrder.reference} updated successfully.`);
    } else {
      const res = await deliveryOrdersApi.createDeliveryOrder(formData);
      showToast('success', 'Order Created', res.message || `Outbound order ${res.deliveryOrder.reference} created.`);
    }
    // Refresh list, meta, and products (stock quantities might have decreased if Done)
    await Promise.all([fetchDeliveryOrders(filters), fetchMetaAndProducts()]);
  };

  // Confirm cancel/delete delivery order
  const handleCancelConfirm = async (id: number) => {
    const res = await deliveryOrdersApi.deleteDeliveryOrder(id);
    showToast('success', 'Order Canceled', res.message || 'The delivery order has been canceled and removed.');
    await Promise.all([fetchDeliveryOrders(filters), fetchMetaAndProducts()]);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Delivery Orders & Outbound Dispatch
            </h1>
            <p className="text-xs text-slate-500">
              Pick, pack, schedule, and dispatch outbound inventory shipments to customers and depots
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleFullRefresh}
            disabled={isLoadingOrders || isLoadingMeta}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            title="Refresh delivery orders and inventory"
            aria-label="Refresh delivery orders"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingOrders || isLoadingMeta ? 'animate-spin text-blue-600' : ''}`}
            />
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Delivery Order</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {pageError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{pageError}</span>
          <button
            onClick={() => fetchDeliveryOrders(filters)}
            className="font-semibold underline hover:no-underline ml-4 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Total Orders"
          value={isLoadingMeta ? '…' : (meta?.stats?.total ?? 0)}
          sub="All logged outbound dispatches"
          icon={<Layers className="w-5 h-5" />}
          accent="blue"
        />
        <StatCard
          label="Pending Outbound"
          value={isLoadingMeta ? '…' : (meta?.stats?.pending ?? 0)}
          sub="Draft, Waiting & Ready"
          icon={<Clock className="w-5 h-5" />}
          accent="amber"
        />
        <StatCard
          label="Dispatched & Delivered"
          value={isLoadingMeta ? '…' : (meta?.stats?.done ?? 0)}
          sub="Deducted from SQLite stock"
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="emerald"
        />
        <StatCard
          label="Canceled Orders"
          value={isLoadingMeta ? '…' : (meta?.stats?.canceled ?? 0)}
          sub="Void shipments"
          icon={<XCircle className="w-5 h-5" />}
          accent="rose"
        />
      </div>

      {/* ── Delivery Order Filter Bar ───────────────────────────────────────── */}
      <DeliveryOrderFilters
        filters={filters}
        warehouses={meta?.warehouses || []}
        totalCount={totalCount}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* ── Delivery Orders Table ───────────────────────────────────────────── */}
      <DeliveryOrdersTable
        deliveryOrders={deliveryOrders}
        isLoading={isLoadingOrders}
        onEdit={handleOpenEdit}
        onCancel={handleOpenCancel}
        onAddNew={handleOpenCreate}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* ── Form Modal (Create / Edit) ──────────────────────────────────────── */}
      <DeliveryOrderFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingOrder(null);
        }}
        onSubmit={handleFormSubmit}
        initialOrder={editingOrder}
        warehouses={meta?.warehouses || []}
        availableProducts={products}
      />

      {/* ── Cancel Confirmation Modal ───────────────────────────────────────── */}
      <CancelDeliveryOrderModal
        isOpen={isCancelOpen}
        onClose={() => {
          setIsCancelOpen(false);
          setCancelingOrder(null);
        }}
        order={cancelingOrder}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
};
