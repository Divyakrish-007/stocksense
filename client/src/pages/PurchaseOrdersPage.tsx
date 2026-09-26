import React, { useState, useEffect, useCallback } from 'react';
import type { PurchaseOrder, PurchaseOrderFilterState, PurchaseOrdersMeta } from '../types';
import { purchaseOrdersApi } from '../api/purchaseOrders';
import { PurchaseOrderFilters } from '../components/purchase-orders/PurchaseOrderFilters';
import { PurchaseOrdersTable } from '../components/purchase-orders/PurchaseOrdersTable';
import { PurchaseOrderFormModal } from '../components/purchase-orders/PurchaseOrderFormModal';
import { DeletePurchaseOrderModal } from '../components/purchase-orders/DeletePurchaseOrderModal';
import { useToast } from '../context/ToastContext';
import {
  ShoppingCart,
  Plus,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const PurchaseOrdersPage: React.FC = () => {
  const { showToast } = useToast();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [meta, setMeta] = useState<PurchaseOrdersMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<PurchaseOrderFilterState>({
    search: '',
    status: 'All',
    warehouse: 'All',
    supplier: 'All',
    dateFrom: '',
    dateTo: '',
    sortBy: 'id',
    order: 'DESC',
  });

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [poToDelete, setPOToDelete] = useState<PurchaseOrder | null>(null);

  // Fetch Metadata & Stats
  const fetchMeta = useCallback(async () => {
    try {
      const metaData = await purchaseOrdersApi.getMeta();
      setMeta(metaData);
    } catch (err: any) {
      console.error('Failed to fetch purchase orders metadata:', err);
    }
  }, []);

  // Fetch Purchase Orders List
  const fetchPurchaseOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await purchaseOrdersApi.getPurchaseOrders(filters);
      setPurchaseOrders(data.purchaseOrders);
    } catch (err: any) {
      console.error('Failed to fetch purchase orders:', err);
      setError(err?.message || 'Failed to connect to StockSense server');
      showToast('error', 'Fetch Error', 'Failed to load purchase orders list');
    } finally {
      setIsLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // Handler for filter changes
  const handleFilterChange = (key: keyof PurchaseOrderFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'All',
      warehouse: 'All',
      supplier: 'All',
      dateFrom: '',
      dateTo: '',
      sortBy: 'id',
      order: 'DESC',
    });
  };

  // Modal triggers
  const handleAddPO = () => {
    setSelectedPO(null);
    setFormModalOpen(true);
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setFormModalOpen(true);
  };

  const handleDeletePO = (po: PurchaseOrder) => {
    setPOToDelete(po);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (id: number) => {
    try {
      await purchaseOrdersApi.deletePurchaseOrder(id);
      showToast('success', 'Purchase Order Deleted', 'Order removed from system');
      fetchPurchaseOrders();
      fetchMeta();
    } catch (err: any) {
      throw err;
    }
  };

  const handleSaved = () => {
    fetchPurchaseOrders();
    fetchMeta();
  };

  // Derived stats calculation for KPI cards
  const pendingCount = (meta?.stats?.draft || 0) + (meta?.stats?.waiting || 0) + (meta?.stats?.ready || 0) + (meta?.stats?.approved || 0) + (meta?.stats?.ordered || 0);
  const doneCount = (meta?.stats?.done || 0) + (meta?.stats?.received || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Purchase Orders Module
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Issue vendor procurement orders, track shipment status, and execute warehouse stock intake
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleAddPO}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Purchase Order</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total POs */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Purchase Orders
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {meta?.stats?.total ?? purchaseOrders.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">total issued POs</span>
          </div>
        </div>

        {/* Card 2: Pending Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Procurement
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {pendingCount}
            </span>
            <span className="text-xs text-amber-600 font-medium">draft/waiting/ready</span>
          </div>
        </div>

        {/* Card 3: Completed Intake */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Completed Stock Intake
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {doneCount}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">reconciled into stock</span>
          </div>
        </div>

        {/* Card 4: Total Order Value */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Procurement Spent
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              ${(meta?.stats?.total_value || 0).toLocaleString(undefined, {
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
            onClick={fetchPurchaseOrders}
            className="inline-flex items-center gap-1 font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <PurchaseOrderFilters
        filters={filters}
        warehouses={meta?.warehouses || []}
        suppliers={meta?.suppliers || []}
        totalCount={purchaseOrders.length}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Purchase Orders Table */}
      <PurchaseOrdersTable
        purchaseOrders={purchaseOrders}
        isLoading={isLoading}
        onEdit={handleEditPO}
        onDelete={handleDeletePO}
        onAddClick={handleAddPO}
      />

      {/* Add / Edit Form Modal */}
      <PurchaseOrderFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSaved={handleSaved}
        purchaseOrder={selectedPO}
        warehouses={meta?.warehouses || []}
        suppliers={meta?.suppliers || []}
        products={meta?.products || []}
      />

      {/* Delete Confirmation Modal */}
      <DeletePurchaseOrderModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        purchaseOrder={poToDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default PurchaseOrdersPage;
