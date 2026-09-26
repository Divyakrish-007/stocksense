import React, { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '../api/dashboard';
import { useToast } from '../context/ToastContext';
import type {
  KpiStats,
  InventoryActivity,
  FilterOptions,
  DashboardFilterState,
  ActivityStatus,
} from '../types';
import { StatCard } from '../components/common/StatCard';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { ActivityTable } from '../components/dashboard/ActivityTable';
import {
  Boxes,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { showToast } = useToast();

  const [stats, setStats] = useState<KpiStats | null>(null);
  const [activities, setActivities] = useState<InventoryActivity[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    warehouses: [],
    categories: [],
    types: ['Receipts', 'Delivery', 'Internal', 'Adjustments'],
    statuses: ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'],
  });

  const [filters, setFilters] = useState<DashboardFilterState>({
    type: 'All',
    status: 'All',
    warehouse: 'All',
    category: 'All',
    search: '',
  });

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load KPI stats from DB
  const loadStats = useCallback(async () => {
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err: any) {
      showToast('error', 'Stats Error', 'Failed to retrieve inventory KPIs from backend.');
    } finally {
      setIsLoadingStats(false);
    }
  }, [showToast]);

  // Load Filter Options
  const loadFilterOptions = useCallback(async () => {
    try {
      const options = await dashboardApi.getFilterOptions();
      setFilterOptions(options);
    } catch (err: any) {
      console.error('Failed to load filter options:', err);
    }
  }, []);

  // Load Activities based on active filters
  const loadActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    try {
      const res = await dashboardApi.getActivities(filters);
      setActivities(res.activities);
    } catch (err: any) {
      showToast('error', 'Activity Error', 'Failed to retrieve inventory activities.');
    } finally {
      setIsLoadingActivities(false);
    }
  }, [filters, showToast]);

  // Initial load
  useEffect(() => {
    loadStats();
    loadFilterOptions();
  }, [loadStats, loadFilterOptions]);

  // Reload activities on filter changes
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Manual refresh all data
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([loadStats(), loadActivities()]);
    setIsRefreshing(false);
    showToast('info', 'Data Synchronized', 'Dashboard refreshed with latest warehouse database state.');
  };

  const handleFilterChange = (key: keyof DashboardFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      type: 'All',
      status: 'All',
      warehouse: 'All',
      category: 'All',
      search: '',
    });
  };

  // Quick filter by clicking a KPI card
  const handleKpiCardClick = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      type: prev.type === type ? 'All' : type,
    }));
  };

  // Status update
  const handleUpdateStatus = async (id: number, status: ActivityStatus) => {
    try {
      await dashboardApi.updateActivityStatus(id, status);
      showToast('success', 'Status Updated', `Operation marked as "${status}".`);
      // Reload both activities and stats
      loadActivities();
      loadStats();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Context Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Warehouse Inventory Intelligence</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Real-time SQLite
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized stock telemetry across all distribution nodes and active staging bays.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Data</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (5 required KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* 1. Total Products in Stock */}
        <StatCard
          title="Products in Stock"
          value={stats ? stats.totalProductsInStock.totalUnits.toLocaleString() : '—'}
          subtext={
            stats
              ? `${stats.totalProductsInStock.skuCount} active SKUs ($${stats.totalProductsInStock.totalValuation.toLocaleString()} val)`
              : 'Calculating valuation...'
          }
          icon={<Boxes className="w-5 h-5 text-blue-600" />}
          iconBgColor="bg-blue-50 text-blue-600 border-blue-200"
          badge={{
            text: 'Live Stock',
            variant: 'info',
          }}
          isLoading={isLoadingStats}
        />

        {/* 2. Low Stock / Out of Stock Items */}
        <StatCard
          title="Stock Alerts"
          value={stats ? stats.lowStockAlerts.total : '—'}
          subtext={
            stats
              ? `${stats.lowStockAlerts.outOfStock} out of stock, ${stats.lowStockAlerts.lowStock} low`
              : 'Auditing min levels...'
          }
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          iconBgColor="bg-rose-50 text-rose-600 border-rose-200"
          badge={{
            text: stats && stats.lowStockAlerts.outOfStock > 0 ? 'Action Required' : 'Normal',
            variant: stats && stats.lowStockAlerts.outOfStock > 0 ? 'danger' : 'neutral',
          }}
          isLoading={isLoadingStats}
        />

        {/* 3. Pending Receipts */}
        <StatCard
          title="Pending Receipts"
          value={stats ? stats.pendingReceipts.count : '—'}
          subtext={
            stats
              ? `${stats.pendingReceipts.items.toLocaleString()} units to receive`
              : 'Tracking inbound...'
          }
          icon={<ArrowDownLeft className="w-5 h-5 text-indigo-600" />}
          iconBgColor="bg-indigo-50 text-indigo-600 border-indigo-200"
          badge={{
            text: filters.type === 'Receipts' ? 'Filter Active' : 'Inbound',
            variant: filters.type === 'Receipts' ? 'warning' : 'neutral',
          }}
          onClick={() => handleKpiCardClick('Receipts')}
          isLoading={isLoadingStats}
        />

        {/* 4. Pending Deliveries */}
        <StatCard
          title="Pending Deliveries"
          value={stats ? stats.pendingDeliveries.count : '—'}
          subtext={
            stats
              ? `${stats.pendingDeliveries.items.toLocaleString()} units to dispatch`
              : 'Tracking outbound...'
          }
          icon={<ArrowUpRight className="w-5 h-5 text-purple-600" />}
          iconBgColor="bg-purple-50 text-purple-600 border-purple-200"
          badge={{
            text: filters.type === 'Delivery' ? 'Filter Active' : 'Outbound',
            variant: filters.type === 'Delivery' ? 'warning' : 'neutral',
          }}
          onClick={() => handleKpiCardClick('Delivery')}
          isLoading={isLoadingStats}
        />

        {/* 5. Internal Transfers Scheduled */}
        <StatCard
          title="Internal Transfers"
          value={stats ? stats.internalTransfers.count : '—'}
          subtext={
            stats
              ? `${stats.internalTransfers.items.toLocaleString()} units scheduled`
              : 'Depot shuttles...'
          }
          icon={<ArrowLeftRight className="w-5 h-5 text-teal-600" />}
          iconBgColor="bg-teal-50 text-teal-600 border-teal-200"
          badge={{
            text: filters.type === 'Internal' ? 'Filter Active' : 'Inter-WH',
            variant: filters.type === 'Internal' ? 'warning' : 'neutral',
          }}
          onClick={() => handleKpiCardClick('Internal')}
          isLoading={isLoadingStats}
        />
      </div>

      {/* Filter Section */}
      <DashboardFilters
        filters={filters}
        options={filterOptions}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        totalFiltered={activities.length}
      />

      {/* Recent Inventory Activities Section */}
      <ActivityTable
        activities={activities}
        isLoading={isLoadingActivities}
        filterOptions={filterOptions}
        onRefresh={() => {
          loadActivities();
          loadStats();
        }}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};
