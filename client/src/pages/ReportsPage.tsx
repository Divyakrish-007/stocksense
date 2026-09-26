import React, { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '../api/reports';
import { useToast } from '../context/ToastContext';
import type {
  ReportOverview,
  InventoryReport,
  PurchaseReport,
  SalesReport,
  MovementReport,
  WarehouseReport,
  ReportTab,
  Warehouse,
} from '../types';
import { ReportFilters } from '../components/reports/ReportFilters';
import { ReportKpiCards } from '../components/reports/ReportKpiCards';
import { ReportExportButton } from '../components/reports/ReportExportButton';
import { InventoryReportSection } from '../components/reports/InventoryReport';
import { PurchaseReportSection } from '../components/reports/PurchaseReport';
import { SalesReportSection } from '../components/reports/SalesReport';
import { MovementReportSection } from '../components/reports/MovementReport';
import { WarehouseReportSection } from '../components/reports/WarehouseReport';
import {
  BarChart3,
  RefreshCw,
  Boxes,
  Users,
  ShoppingCart,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Package,
  DollarSign,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();

  // Filter state
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouse, setWarehouse] = useState('All');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Data state
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryReport | null>(null);
  const [purchaseData, setPurchaseData] = useState<PurchaseReport | null>(null);
  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [movementData, setMovementData] = useState<MovementReport | null>(null);
  const [warehouseData, setWarehouseData] = useState<WarehouseReport | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load warehouses for filter
  const loadWarehouses = useCallback(async () => {
    try {
      const inv = await reportsApi.getInventoryReport();
      const whList = inv.stockByWarehouse.map((w) => ({
        code: w.warehouse_code,
        name: w.warehouse_name || w.warehouse_code,
        location: '',
      }));
      setWarehouses(whList);
    } catch {
      // warehouses will just be empty
    }
  }, []);

  // Load report data based on active tab
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateFilters = { dateFrom, dateTo };

      switch (activeTab) {
        case 'overview': {
          const data = await reportsApi.getOverview();
          setOverview(data);
          break;
        }
        case 'inventory': {
          const data = await reportsApi.getInventoryReport({ warehouse });
          setInventoryData(data);
          break;
        }
        case 'purchases': {
          const data = await reportsApi.getPurchaseReport(dateFilters);
          setPurchaseData(data);
          break;
        }
        case 'sales': {
          const data = await reportsApi.getSalesReport(dateFilters);
          setSalesData(data);
          break;
        }
        case 'movements': {
          const data = await reportsApi.getMovementReport(dateFilters);
          setMovementData(data);
          break;
        }
        case 'warehouses': {
          const data = await reportsApi.getWarehouseReport();
          setWarehouseData(data);
          break;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showToast('error', 'Report Error', `Failed to load ${activeTab} report: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, dateFrom, dateTo, warehouse, showToast]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    showToast('info', 'Reports Refreshed', 'All report data has been re-fetched from the database.');
  };

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setWarehouse('All');
  };

  // Overview KPI cards
  const overviewCards = overview
    ? [
        {
          label: 'Products',
          value: overview.totalProducts,
          subtext: `${overview.totalInventoryQuantity.toLocaleString()} units`,
          icon: <Boxes className="w-4 h-4" />,
          color: 'bg-blue-50 text-blue-600 border-blue-100',
        },
        {
          label: 'Inventory Value',
          value: `$${overview.totalInventoryValue.toLocaleString()}`,
          subtext: `${overview.lowStockProducts} low / ${overview.outOfStockProducts} out`,
          icon: <DollarSign className="w-4 h-4" />,
          color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        },
        {
          label: 'Suppliers',
          value: overview.totalSuppliers,
          subtext: 'Active suppliers',
          icon: <Package className="w-4 h-4" />,
          color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        },
        {
          label: 'Customers',
          value: overview.totalCustomers,
          subtext: 'Unique customers',
          icon: <Users className="w-4 h-4" />,
          color: 'bg-violet-50 text-violet-600 border-violet-100',
        },
        {
          label: 'Purchase Orders',
          value: overview.totalPurchaseOrders,
          subtext: 'All POs',
          icon: <ShoppingCart className="w-4 h-4" />,
          color: 'bg-cyan-50 text-cyan-600 border-cyan-100',
        },
        {
          label: 'Sales Orders',
          value: overview.totalSalesOrders,
          subtext: 'All SOs',
          icon: <ShoppingBag className="w-4 h-4" />,
          color: 'bg-purple-50 text-purple-600 border-purple-100',
        },
        {
          label: 'Receipts',
          value: overview.totalReceipts,
          subtext: 'Inbound receipts',
          icon: <ArrowDownLeft className="w-4 h-4" />,
          color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        },
        {
          label: 'Deliveries',
          value: overview.totalDeliveries,
          subtext: 'Outbound deliveries',
          icon: <ArrowUpRight className="w-4 h-4" />,
          color: 'bg-sky-50 text-sky-600 border-sky-100',
        },
        {
          label: 'Transfers',
          value: overview.totalInternalTransfers,
          subtext: 'Internal transfers',
          icon: <ArrowLeftRight className="w-4 h-4" />,
          color: 'bg-amber-50 text-amber-600 border-amber-100',
        },
        {
          label: 'Adjustments',
          value: overview.totalAdjustments,
          subtext: 'Inventory adjustments',
          icon: <SlidersHorizontal className="w-4 h-4" />,
          color: 'bg-orange-50 text-orange-600 border-orange-100',
        },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Analyze inventory, procurement, sales and warehouse performance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ReportExportButton activeTab={activeTab} dateFrom={dateFrom} dateTo={dateTo} />
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <ReportFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        warehouse={warehouse}
        activeTab={activeTab}
        warehouses={warehouses}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onWarehouseChange={setWarehouse}
        onTabChange={setActiveTab}
        onReset={handleReset}
      />

      {/* Report Sections */}
      <div className="space-y-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">System Overview</h2>
            </div>
            <ReportKpiCards cards={overviewCards} isLoading={isLoading} />
          </div>
        )}

        {activeTab === 'inventory' && (
          <InventoryReportSection data={inventoryData} isLoading={isLoading} />
        )}

        {activeTab === 'purchases' && (
          <PurchaseReportSection data={purchaseData} isLoading={isLoading} />
        )}

        {activeTab === 'sales' && (
          <SalesReportSection data={salesData} isLoading={isLoading} />
        )}

        {activeTab === 'movements' && (
          <MovementReportSection data={movementData} isLoading={isLoading} />
        )}

        {activeTab === 'warehouses' && (
          <WarehouseReportSection data={warehouseData} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
};
