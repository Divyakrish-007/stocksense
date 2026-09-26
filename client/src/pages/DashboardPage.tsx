import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { useToast } from '../context/ToastContext';
import type { DashboardOverview } from '../types';
import {
  Boxes,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw,
  DollarSign,
  ShoppingCart,
  ShoppingBag,
  Package,
  Users,
  Warehouse,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getOverview();
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to load dashboard overview:', err);
      setError(err?.message || 'Failed to connect to StockSense server');
      showToast('error', 'Dashboard Error', 'Failed to retrieve executive analytics overview.');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await dashboardApi.getOverview();
      setOverview(data);
      showToast('info', 'Synchronized', 'Dashboard refreshed with live database metrics.');
    } catch (err: any) {
      showToast('error', 'Refresh Error', 'Failed to refresh metrics');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading && !overview) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto space-y-6">
        <div className="h-10 bg-slate-200 animate-pulse rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Dashboard Unavailable</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <button
          onClick={fetchOverview}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const kpis = overview?.kpis;
  const health = overview?.inventoryHealth;
  const procurement = overview?.procurement;
  const sales = overview?.sales;
  const warehouses = overview?.warehouses || [];
  const movements = overview?.movements;
  const lowStockAlerts = overview?.lowStockAlerts || [];
  const activities = overview?.recentActivities || [];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header & Quick Action Launcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-7 h-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time operational analytics, inventory health, procurement, and warehouse performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Sync Live Data</span>
          </button>
        </div>
      </div>

      {/* Quick Action Shortcut Ribbon */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] px-2 shrink-0">
          Quick Actions:
        </span>
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg font-medium border border-slate-200/60 shrink-0 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Product
        </button>
        <button
          onClick={() => navigate('/purchase-orders')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg font-medium border border-slate-200/60 shrink-0 transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Purchase Order
        </button>
        <button
          onClick={() => navigate('/sales-orders')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg font-medium border border-slate-200/60 shrink-0 transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Sales Order
        </button>
        <button
          onClick={() => navigate('/receipts')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg font-medium border border-slate-200/60 shrink-0 transition-colors"
        >
          <ArrowDownLeft className="w-3.5 h-3.5" /> Receipt
        </button>
        <button
          onClick={() => navigate('/delivery-orders')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg font-medium border border-slate-200/60 shrink-0 transition-colors"
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Delivery Order
        </button>
        <button
          onClick={() => navigate('/internal-transfers')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg font-medium border border-slate-200/60 shrink-0 transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
        </button>
        <button
          onClick={() => navigate('/inventory-adjustments')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg font-medium border border-slate-200/60 shrink-0 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Adjustment
        </button>
        <button
          onClick={() => navigate('/suppliers')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg font-medium border border-slate-200/60 shrink-0 transition-colors"
        >
          <Package className="w-3.5 h-3.5" /> Supplier
        </button>
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg font-medium border border-slate-200/60 shrink-0 transition-colors"
        >
          <Users className="w-3.5 h-3.5" /> Customer
        </button>
      </div>

      {/* 1. Executive KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Inventory Value */}
        <div
          onClick={() => navigate('/reports')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Inventory Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-2">
            ${kpis?.totalInventoryValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" /> Valuation asset total
          </p>
        </div>

        {/* Total Products */}
        <div
          onClick={() => navigate('/products')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Products</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-2">{kpis?.totalProducts ?? 0} SKUs</h3>
          <p className="text-[10px] text-slate-400 mt-1">{kpis?.totalStockUnits ?? 0} total units in stock</p>
        </div>

        {/* Low Stock Items */}
        <div
          onClick={() => navigate('/products')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-amber-300 hover:shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Low Stock Items</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-amber-600 mt-2">{kpis?.lowStockItems ?? 0}</h3>
          <p className="text-[10px] text-amber-600/80 mt-1">Requires reorder attention</p>
        </div>

        {/* Out of Stock Items */}
        <div
          onClick={() => navigate('/products')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-rose-300 hover:shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Out of Stock</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-rose-600 mt-2">{kpis?.outOfStockItems ?? 0}</h3>
          <p className="text-[10px] text-rose-600/80 mt-1">Critical zero balance</p>
        </div>

        {/* Purchase Orders */}
        <div
          onClick={() => navigate('/purchase-orders')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Purchase Orders</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-2">{kpis?.purchaseOrders ?? 0}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Inbound procurement</p>
        </div>

        {/* Sales Orders */}
        <div
          onClick={() => navigate('/sales-orders')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Sales Orders</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-2">{kpis?.salesOrders ?? 0}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Customer orders</p>
        </div>

        {/* Active Suppliers */}
        <div
          onClick={() => navigate('/suppliers')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Active Suppliers</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-2">{kpis?.activeSuppliers ?? 0}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Vendor directory</p>
        </div>

        {/* Active Customers */}
        <div
          onClick={() => navigate('/customers')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Active Customers</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-2">{kpis?.activeCustomers ?? 0}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Client accounts</p>
        </div>

        {/* Inventory Health Ratio */}
        <div
          onClick={() => navigate('/reports')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow transition-all cursor-pointer group sm:col-span-2 xl:col-span-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Stock Health Index</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {health?.healthPercentage ?? 100}% Optimal
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${health?.healthPercentage ?? 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2">
            <span>In Stock: <strong className="text-slate-800">{health?.inStock}</strong></span>
            <span>Low Stock: <strong className="text-amber-600">{health?.lowStock}</strong></span>
            <span>Out of Stock: <strong className="text-rose-600">{health?.outOfStock}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Procurement & Sales Side-by-Side Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Procurement Overview */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Procurement Overview</h2>
            </div>
            <button
              onClick={() => navigate('/purchase-orders')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View POs <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium">Draft</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{procurement?.draftPOs ?? 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
              <p className="text-[10px] text-amber-700 font-medium">Waiting</p>
              <p className="text-sm font-bold text-amber-800 mt-0.5">{procurement?.waitingPOs ?? 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100">
              <p className="text-[10px] text-blue-700 font-medium">Ready</p>
              <p className="text-sm font-bold text-blue-800 mt-0.5">{procurement?.readyPOs ?? 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <p className="text-[10px] text-emerald-700 font-medium">Completed</p>
              <p className="text-sm font-bold text-emerald-800 mt-0.5">{procurement?.completedPOs ?? 0}</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Recent Purchase Orders</h4>
            <div className="space-y-1.5">
              {procurement?.recentPurchaseOrders?.slice(0, 4).map((po) => (
                <div
                  key={po.id}
                  onClick={() => navigate('/purchase-orders')}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 text-xs cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-mono font-semibold text-blue-600">{po.reference}</span>
                    <span className="text-slate-500 text-[11px] ml-2">({po.supplier_name || 'Vendor'})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800">
                      ${Number(po.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        po.status === 'Done'
                          ? 'bg-emerald-100 text-emerald-800'
                          : po.status === 'Ready'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sales Overview */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-bold text-slate-900">Sales Overview</h2>
            </div>
            <button
              onClick={() => navigate('/sales-orders')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View SOs <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium">Draft</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{sales?.draftSOs ?? 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100">
              <p className="text-[10px] text-blue-700 font-medium">Ready</p>
              <p className="text-sm font-bold text-blue-800 mt-0.5">{sales?.readySOs ?? 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <p className="text-[10px] text-emerald-700 font-medium">Completed</p>
              <p className="text-sm font-bold text-emerald-800 mt-0.5">{sales?.completedSOs ?? 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-50/60 border border-purple-100">
              <p className="text-[10px] text-purple-700 font-medium">Total Revenue</p>
              <p className="text-sm font-bold text-purple-800 mt-0.5">
                ${sales?.totalSalesRevenue ? (sales.totalSalesRevenue / 1000).toFixed(1) + 'k' : '$0'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Recent Sales Orders</h4>
            <div className="space-y-1.5">
              {sales?.recentSalesOrders?.slice(0, 4).map((so) => (
                <div
                  key={so.id}
                  onClick={() => navigate('/sales-orders')}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 text-xs cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-mono font-semibold text-purple-600">{so.reference}</span>
                    <span className="text-slate-500 text-[11px] ml-2">({so.customer})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800">
                      ${Number(so.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        so.status === 'Done'
                          ? 'bg-emerald-100 text-emerald-800'
                          : so.status === 'Ready'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {so.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Warehouse Overview & Movement Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouse Occupancy Grid */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Warehouse Facility Analytics</h2>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Warehouse Report <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map((wh) => (
              <div
                key={wh.warehouse_code}
                onClick={() => navigate('/products')}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {wh.warehouse_code}
                    </span>
                    <span className="font-semibold text-xs text-slate-900">{wh.warehouse_name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">{wh.utilization}% Cap</span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${wh.utilization}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] mt-3 pt-2 border-t border-slate-200/60 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Stock Units</span>
                    <strong className="text-slate-800">{wh.total_stock}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Valuation</span>
                    <strong className="text-emerald-600">${wh.inventory_value.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">In / Out Vol</span>
                    <strong className="text-slate-800">{wh.inbound_movements} / {wh.outbound_movements}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Movement Totals */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Stock Movements</h2>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Details <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div
              onClick={() => navigate('/receipts')}
              className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between cursor-pointer hover:bg-emerald-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Receipts (Inbound)</p>
                  <p className="text-[10px] text-slate-500">{movements?.receipts.count ?? 0} Logged Documents</p>
                </div>
              </div>
              <span className="font-bold text-emerald-700 text-sm">+{movements?.receipts.totalQuantity ?? 0}</span>
            </div>

            <div
              onClick={() => navigate('/delivery-orders')}
              className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 flex items-center justify-between cursor-pointer hover:bg-rose-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Deliveries (Outbound)</p>
                  <p className="text-[10px] text-slate-500">{movements?.deliveries.count ?? 0} Logged Documents</p>
                </div>
              </div>
              <span className="font-bold text-rose-700 text-sm">-{movements?.deliveries.totalQuantity ?? 0}</span>
            </div>

            <div
              onClick={() => navigate('/internal-transfers')}
              className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between cursor-pointer hover:bg-blue-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Internal Transfers</p>
                  <p className="text-[10px] text-slate-500">{movements?.internalTransfers.count ?? 0} Logged Relocations</p>
                </div>
              </div>
              <span className="font-bold text-blue-700 text-sm">{movements?.internalTransfers.totalQuantity ?? 0}</span>
            </div>

            <div
              onClick={() => navigate('/inventory-adjustments')}
              className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between cursor-pointer hover:bg-purple-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Adjustments</p>
                  <p className="text-[10px] text-slate-500">{movements?.adjustments.count ?? 0} Reconciliations</p>
                </div>
              </div>
              <span className="font-bold text-purple-700 text-sm">±{movements?.adjustments.totalQuantity ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Low Stock Reorder Alerts Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">Low Stock & Reorder Alerts</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {lowStockAlerts.length} Action Items
            </span>
          </div>
          <button
            onClick={() => navigate('/products')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Manage Products <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {lowStockAlerts.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-700">All Product Inventory Stocked Optimally</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Warehouse</th>
                  <th className="py-2.5 px-3">Current Stock</th>
                  <th className="py-2.5 px-3">Min Level</th>
                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockAlerts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.severity === 'Critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : item.severity === 'High'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">{item.sku}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{item.category}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{item.warehouse_code}</td>
                    <td className="py-2.5 px-3 font-bold text-rose-600">{item.quantity}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-500">{item.min_stock_level}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => navigate('/purchase-orders')}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-semibold transition-colors shadow-sm"
                      >
                        Reorder PO
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Recent Inventory Activity Log */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h2 className="text-base font-bold text-slate-900">Recent Inventory Activities</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Last 10 Logged Transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Source → Dest</th>
                <th className="py-2.5 px-3">Items Count</th>
                <th className="py-2.5 px-3">Scheduled Date</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">{act.reference}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-800">{act.type}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{act.contact}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                    {act.source_location} → {act.dest_location}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{act.items_count}</td>
                  <td className="py-2.5 px-3 text-slate-500">{act.scheduled_date}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        act.status === 'Done'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : act.status === 'Ready'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : act.status === 'Waiting'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {act.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
