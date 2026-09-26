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

// Product Management Types
export type ProductStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  min_stock_level: number;
  unit_price: number;
  warehouse_code: string;
  status: ProductStatus;
  warehouse_name?: string;
  warehouse_location?: string;
}

export interface ProductFormData {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  min_stock_level: number;
  unit_price: number;
  warehouse_code: string;
}

export interface ProductFilterState {
  search: string;
  category: string;
  warehouse: string;
  status: string;
  sortBy: 'id' | 'name' | 'sku' | 'quantity' | 'unit_price';
  order: 'ASC' | 'DESC';
}

export interface ProductsMeta {
  categories: string[];
  warehouses: Warehouse[];
  stats: {
    totalSkus: number;
    totalUnits: number;
    totalValuation: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}


// --- Receipt Module Types ---

export type ReceiptStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled';

export interface ReceiptItem {
  id?: number;
  product_id: number;
  quantity: number;
  sku?: string;
  product_name?: string;
  category?: string;
}

export interface Receipt {
  id: number;
  reference: string;
  vendor: string;
  warehouse_code: string;
  warehouse_name?: string;
  warehouse_location?: string;
  scheduled_date: string;
  status: ReceiptStatus;
  notes?: string;
  created_at?: string;
  item_lines: number;
  total_qty: number;
  items: ReceiptItem[];
}

export interface ReceiptFormData {
  vendor: string;
  warehouseCode: string;
  scheduledDate: string;
  status: ReceiptStatus;
  notes: string;
  items: { productId: number; quantity: number }[];
}

export interface ReceiptFilterState {
  search: string;
  status: string;
  warehouse: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'id' | 'reference' | 'vendor' | 'scheduled_date' | 'status';
  order: 'ASC' | 'DESC';
}

export interface ReceiptsMeta {
  warehouses: Warehouse[];
  stats: {
    total: number;
    pending: number;
    done: number;
    canceled: number;
  };
}
// --- Delivery Orders Module Types ---

export type DeliveryOrderStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled';

export interface DeliveryOrderItem {
  id?: number;
  delivery_order_id?: number;
  product_id: number;
  quantity: number;
  sku?: string;
  product_name?: string;
  category?: string;
  available_stock?: number;
  unit_price?: number;
}

export interface DeliveryOrder {
  id: number;
  reference: string;
  customer: string;
  warehouse_code: string;
  warehouse_name?: string;
  warehouse_location?: string;
  destination_address: string;
  scheduled_date: string;
  status: DeliveryOrderStatus;
  notes?: string;
  created_at?: string;
  item_lines: number;
  total_qty: number;
  items: DeliveryOrderItem[];
}

export interface DeliveryOrderFormData {
  customer: string;
  warehouseCode: string;
  destinationAddress: string;
  scheduledDate: string;
  status: DeliveryOrderStatus;
  notes: string;
  items: { productId: number; quantity: number }[];
}

export interface DeliveryOrderFilterState {
  search: string;
  status: string;
  warehouse: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'id' | 'reference' | 'customer' | 'scheduled_date' | 'status';
  order: 'ASC' | 'DESC';
}

export interface DeliveryOrdersMeta {
  warehouses: Warehouse[];
  stats: {
    total: number;
    pending: number;
    done: number;
    canceled: number;
  };
}
