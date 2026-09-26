import React, { useState, useEffect, useCallback } from 'react';
import type { SalesOrder, SalesOrderFilterState, SalesOrdersMeta } from '../types';
import { salesOrdersApi } from '../api/salesOrders';
import { SalesOrderFilters } from '../components/sales-orders/SalesOrderFilters';
import { SalesOrdersTable } from '../components/sales-orders/SalesOrdersTable';
import { SalesOrderFormModal } from '../components/sales-orders/SalesOrderFormModal';
import { DeleteSalesOrderModal } from '../components/sales-orders/DeleteSalesOrderModal';
import { useToast } from '../context/ToastContext';
import {
  ShoppingBag,
  Plus,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  RefreshCw,
  PackageCheck,
  XCircle,
} from 'lucide-react';

export const SalesOrdersPage: React.FC = () => {
  const { showToast } = useToast();

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [meta, setMeta] = useState<SalesOrdersMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<SalesOrderFilterState>({
    search: '',
    status: 'All',
    warehouse: 'All',
    dateFrom: '',
    dateTo: '',
    sortBy: 'id',
    order: 'DESC',
  });

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [soToDelete, setSOToDelete] = useState<SalesOrder | null>(null);

  // Fetch Metadata & Stats
  const fetchMeta = useCallback(async () => {
    try {
      const metaData = await salesOrdersApi.getMeta();
      setMeta(metaData);
    } catch (err: any) {
      console.error('Failed to fetch sales orders metadata:', err);
    }
  }, []);

  // Fetch Sales Orders List
  const fetchSalesOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await salesOrdersApi.getSalesOrders(filters);
      setSalesOrders(data.salesOrders);
    } catch (err: any) {
      console.error('Failed to fetch sales orders:', err);
      setError(err?.message || 'Failed to connect to StockSense server');
      showToast('error', 'Fetch Error', 'Failed to load sales orders list');
    } finally {
      setIsLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchSalesOrders();
  }, [fetchSalesOrders]);

  // Handler for filter changes
  const handleFilterChange = (key: keyof SalesOrderFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'All',
      warehouse: 'All',
      dateFrom: '',
      dateTo: '',
      sortBy: 'id',
      order: 'DESC',
    });
  };

  // Modal triggers
  const handleAddSO = () => {
    setSelectedSO(null);
    setFormModalOpen(true);
  };

  const handleEditSO = (so: SalesOrder) => {
    setSelectedSO(so);
    setFormModalOpen(true);
  };

  const handleDeleteSO = (so: SalesOrder) => {
    setSOToDelete(so);
    setDeleteModalOpen(true);
  };

  const handleViewSO = (so: SalesOrder) => {
    setSelectedSO(so);
    setFormModalOpen(true);
  };

  const handleSaved = () => {
    fetchSalesOrders();
    fetchMeta();
  };

  const handleDeleted = () => {
    fetchSalesOrders();
    fetchMeta();
  };

  // Derived stats calculation for KPI cards
  const pendingCount = (meta?.draft || 0) + (meta?.waiting || 0);
  const readyCount = meta?.ready || 0;
  const doneCount = meta?.done || 0;
  const canceledCount = meta?.canceled || 0;
  const totalValuation = meta?.totalValuation || meta?.stats?.totalValuation || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Sales Orders Module
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage customer orders, shipping dispatch, and outbound warehouse inventory deduction
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleAddSO}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Sales Order</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {meta?.total ?? salesOrders.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">orders</span>
          </div>
        </div>

        {/* Card 2: Pending Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Orders
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {pendingCount}
            </span>
            <span className="text-[10px] text-amber-600 font-medium">draft/waiting</span>
          </div>
        </div>

        {/* Card 3: Ready to Ship */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Ready to Ship
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <PackageCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {readyCount}
            </span>
            <span className="text-[10px] text-blue-600 font-semibold">staged</span>
          </div>
        </div>

        {/* Card 4: Completed Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Completed Orders
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {doneCount}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">fulfilled</span>
          </div>
        </div>

        {/* Card 5: Canceled Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Canceled Orders
            </span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {canceledCount}
            </span>
            <span className="text-[10px] text-rose-500 font-medium">canceled</span>
          </div>
        </div>

        {/* Card 6: Total Sales Value */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Sales Value
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-slate-900 font-mono">
              ${totalValuation.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
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
            onClick={fetchSalesOrders}
            className="inline-flex items-center gap-1 font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <SalesOrderFilters
        filters={filters}
        warehouses={meta?.warehouses || []}
        totalCount={salesOrders.length}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Sales Orders Table */}
      <SalesOrdersTable
        salesOrders={salesOrders}
        loading={isLoading}
        onEdit={handleEditSO}
        onDelete={handleDeleteSO}
        onView={handleViewSO}
      />

      {/* Add / Edit Form Modal */}
      <SalesOrderFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSaved={handleSaved}
        salesOrder={selectedSO}
        warehouses={meta?.warehouses || []}
        products={meta?.products || []}
        customerNames={meta?.customers || meta?.customerNames || []}
      />

      {/* Delete Confirmation Modal */}
      <DeleteSalesOrderModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        salesOrder={soToDelete}
        onDeleted={handleDeleted}
      />
    </div>
  );
};

export default SalesOrdersPage;
