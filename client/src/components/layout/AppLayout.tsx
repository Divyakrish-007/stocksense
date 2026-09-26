import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
}

const ROUTE_HEADERS: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Inventory Dashboard',
    subtitle: 'Centralized real-time overview of warehouse operations & telemetry',
  },
  '/products': {
    title: 'Products & Master Catalog',
    subtitle: 'SKU inventory levels, categories, safety thresholds, and bin locations',
  },
  '/receipts': {
    title: 'Inbound Receipts & Vendor POs',
    subtitle: 'Dock arrivals, freight shipments, staging lanes, and vendor PO matching',
  },
  '/delivery-orders': {
    title: 'Delivery Orders & Outbound Dispatch',
    subtitle: 'Wave picking, packing slips, staging bays, and outbound courier handover',
  },
  '/internal-transfers': {
    title: 'Internal Stock Transfers',
    subtitle: 'Inter-facility inventory movement, depot shuttles, and stock rebalancing',
  },
  '/inventory-adjustments': {
    title: 'Inventory Adjustments & Audits',
    subtitle: 'Cycle counts, discrepancy reconciliation, and scrap write-offs',
  },
  '/move-history': {
    title: 'Move History & Stock Ledger',
    subtitle: 'Immutable audit trail of all warehouse physical stock changes',
  },
  '/settings': {
    title: 'System Configuration & Facilities',
    subtitle: 'Warehouse facility zones, rack coordinates, and operational rules',
  },
  '/profile': {
    title: 'Operator Profile & Preferences',
    subtitle: 'Assigned distribution facilities and session security credentials',
  },
};

export const AppLayout: React.FC<AppLayoutProps> = ({ title, subtitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentHeader = ROUTE_HEADERS[location.pathname] || {
    title: title || 'Inventory Dashboard',
    subtitle: subtitle || 'Centralized real-time overview of warehouse operations',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar (Desktop & Mobile Drawer) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          title={title || currentHeader.title}
          subtitle={subtitle || currentHeader.subtitle}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

