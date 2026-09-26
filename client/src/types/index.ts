export type UserRole = 'Inventory Manager' | 'Warehouse Staff';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export type DocumentType = 'Receipts' | 'Delivery' | 'Internal' | 'Adjustments';

export type ActivityStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled';

export interface InventoryActivity {
  id: number;
  reference: string;
  type: DocumentType;
  contact: string;
  source_location: string;
  dest_location: string;
  category: string;
  items_count: number;
  scheduled_date: string;
  status: ActivityStatus;
  notes?: string;
  created_at?: string;
}

export interface KpiStats {
  totalProductsInStock: {
    skuCount: number;
    totalUnits: number;
    totalValuation: number;
  };
  lowStockAlerts: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
  pendingReceipts: {
    count: number;
    items: number;
  };
  pendingDeliveries: {
    count: number;
    items: number;
  };
  internalTransfers: {
    count: number;
    items: number;
  };
}

export interface Warehouse {
  code: string;
  name: string;
  location: string;
  capacity?: number;
}

export interface FilterOptions {
  warehouses: Warehouse[];
  categories: string[];
  types: DocumentType[];
  statuses: ActivityStatus[];
}

export interface DashboardFilterState {
  type: string;
  status: string;
  warehouse: string;
  category: string;
  search: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}
