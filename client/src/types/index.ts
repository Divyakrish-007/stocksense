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

// --- Internal Transfers Module Types ---

export type InternalTransferStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled';

export interface InternalTransferItem {
  id?: number;
  internal_transfer_id?: number;
  product_id: number;
  quantity: number;
  sku?: string;
  product_name?: string;
  category?: string;
  unit_price?: number;
  source_stock?: number;
  dest_stock?: number;
}

export interface InternalTransfer {
  id: number;
  reference: string;
  source_warehouse_code: string;
  source_warehouse_name?: string;
  dest_warehouse_code: string;
  dest_warehouse_name?: string;
  scheduled_date: string;
  status: InternalTransferStatus;
  notes?: string;
  created_at?: string;
  item_lines: number;
  total_qty: number;
  items: InternalTransferItem[];
}

export interface InternalTransferFormData {
  sourceWarehouseCode: string;
  destWarehouseCode: string;
  scheduledDate: string;
  status: InternalTransferStatus;
  notes: string;
  items: { productId: number; quantity: number }[];
}

export interface InternalTransferFilterState {
  search: string;
  status: string;
  sourceWarehouse: string;
  destWarehouse: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'id' | 'reference' | 'source_warehouse_code' | 'dest_warehouse_code' | 'scheduled_date' | 'status';
  order: 'ASC' | 'DESC';
}

export interface InternalTransfersMeta {
  warehouses: Warehouse[];
  stats: {
    total: number;
    pending: number;
    done: number;
    canceled: number;
  };
}

// --- Inventory Adjustments Module Types ---

export type InventoryAdjustmentStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled';

export type InventoryAdjustmentType = 'Increase' | 'Decrease' | 'Set';

export interface InventoryAdjustmentItem {
  id?: number;
  adjustment_id?: number;
  product_id: number;
  quantity: number;
  previous_quantity: number;
  adjusted_quantity: number;
  sku?: string;
  product_name?: string;
  category?: string;
  unit_price?: number;
  total_product_stock?: number;
  current_warehouse_stock?: number;
}

export interface InventoryAdjustment {
  id: number;
  reference: string;
  warehouse_code: string;
  warehouse_name?: string;
  warehouse_location?: string;
  reason: string;
  adjustment_type: InventoryAdjustmentType;
  status: InventoryAdjustmentStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  item_lines: number;
  total_qty: number;
  items: InventoryAdjustmentItem[];
}

export interface InventoryAdjustmentFormData {
  warehouseCode: string;
  reason: string;
  adjustmentType: InventoryAdjustmentType;
  status: InventoryAdjustmentStatus;
  notes: string;
  items: { productId: number; quantity: number }[];
}

export interface InventoryAdjustmentFilterState {
  search: string;
  status: string;
  warehouse: string;
  adjustmentType: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'id' | 'reference' | 'warehouse_code' | 'reason' | 'adjustment_type' | 'created_at' | 'status';
  order: 'ASC' | 'DESC';
}

export interface InventoryAdjustmentsMeta {
  warehouses: Warehouse[];
  reasons: string[];
  types: InventoryAdjustmentType[];
  stats: {
    total: number;
    pending: number;
    done: number;
    canceled: number;
  };
}

// --- Suppliers Module Types ---

export type SupplierStatus = 'Active' | 'Inactive';

export interface Supplier {
  id: number;
  code: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  tax_id: string;
  payment_terms: string;
  notes?: string;
  status: SupplierStatus;
  total_orders: number;
  total_value: number;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierFormData {
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  taxId: string;
  paymentTerms: string;
  notes: string;
  status: SupplierStatus;
}

export interface SupplierFilterState {
  search: string;
  status: string;
  city: string;
  sortBy: 'id' | 'code' | 'name' | 'total_orders' | 'total_value';
  order: 'ASC' | 'DESC';
}

export interface SuppliersMeta {
  stats: {
    total: number;
    active: number;
    inactive: number;
    totalOrders: number;
  };
  cities: string[];
  paymentTerms: string[];
}

// --- Customers Module Types ---

export type CustomerStatus = 'Active' | 'Inactive';

export interface Customer {
  id: number;
  code: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  tax_id: string;
  payment_terms: string;
  notes?: string;
  status: CustomerStatus;
  total_orders: number;
  total_value: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerFormData {
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  taxId: string;
  paymentTerms: string;
  notes: string;
  status: CustomerStatus;
}

export interface CustomerFilterState {
  search: string;
  status: string;
  city: string;
  sortBy: 'id' | 'code' | 'name' | 'total_orders' | 'total_value';
  order: 'ASC' | 'DESC';
}

export interface CustomersMeta {
  stats: {
    total: number;
    active: number;
    inactive: number;
    totalOrders: number;
  };
  cities: string[];
  paymentTerms: string[];
}

// --- Purchase Orders Module Types ---

export type PurchaseOrderStatus =
  | 'Draft'
  | 'Waiting'
  | 'Ready'
  | 'Done'
  | 'Approved'
  | 'Ordered'
  | 'Partially Received'
  | 'Received'
  | 'Canceled';

export interface PurchaseOrderItem {
  id?: number;
  purchase_order_id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
  line_total: number;
  quantity_received: number;
  sku?: string;
  product_name?: string;
  category?: string;
  current_stock?: number;
}

export interface PurchaseOrder {
  id: number;
  reference: string;
  supplier_id: number;
  supplier_name?: string;
  supplier_code?: string;
  supplier_contact?: string;
  supplier_email?: string;
  warehouse_code: string;
  warehouse_name?: string;
  warehouse_location?: string;
  order_date: string;
  expected_date: string;
  payment_terms: string;
  notes?: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  status: PurchaseOrderStatus;
  item_lines: number;
  total_qty: number;
  total_received: number;
  created_at?: string;
  updated_at?: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderFormData {
  supplierId: number | null;
  warehouseCode: string;
  orderDate: string;
  expectedDate: string;
  paymentTerms: string;
  notes: string;
  status: PurchaseOrderStatus;
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount: number;
  }[];
}

export interface PurchaseOrderFilterState {
  search: string;
  status: string;
  warehouse: string;
  supplier: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'id' | 'reference' | 'supplier_name' | 'order_date' | 'expected_date' | 'grand_total' | 'status';
  order: 'ASC' | 'DESC';
}

export interface PurchaseOrdersMeta {
  warehouses: Warehouse[];
  suppliers: Pick<Supplier, 'id' | 'code' | 'name' | 'payment_terms'>[];
  products: Product[];
  stats: {
    total: number;
    draft: number;
    waiting: number;
    ready: number;
    done: number;
    approved: number;
    ordered: number;
    partially_received: number;
    received: number;
    canceled: number;
    total_value: number;
  };
}

export interface ReceiveItem {
  poItemId: number;
  quantityReceived: number;
}

// --- Sales Orders Module Types ---

export type SalesOrderStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled';

export interface SalesOrderItem {
  id?: number;
  sales_order_id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
  line_total: number;
  quantity_shipped: number;
  sku?: string;
  product_name?: string;
  category?: string;
  available_stock?: number;
  current_stock?: number;
}

export interface SalesOrder {
  id: number;
  reference: string;
  customer: string;
  warehouse_code: string;
  warehouse_name?: string;
  warehouse_location?: string;
  order_date: string;
  expected_date?: string;
  shipping_address?: string;
  payment_terms?: string;
  notes?: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  status: SalesOrderStatus;
  item_lines?: number;
  total_qty?: number;
  total_shipped?: number;
  created_at?: string;
  updated_at?: string;
  items: SalesOrderItem[];
}

export interface SalesOrderFormData {
  customer: string;
  warehouseCode: string;
  orderDate: string;
  expectedDate?: string;
  shippingAddress?: string;
  paymentTerms?: string;
  notes?: string;
  status: SalesOrderStatus;
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount: number;
  }[];
}

export interface SalesOrderFilterState {
  search: string;
  status: string;
  warehouse: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'id' | 'reference' | 'customer' | 'order_date' | 'expected_date' | 'grand_total' | 'status';
  order: 'ASC' | 'DESC';
}

export interface SalesOrdersMeta {
  total: number;
  draft: number;
  waiting: number;
  ready: number;
  done: number;
  canceled: number;
  totalValuation: number;
  warehouses: Warehouse[];
  products: Product[];
  customers?: string[];
  customerNames?: string[];
  stats: {
    total: number;
    draft: number;
    waiting: number;
    ready: number;
    done: number;
    canceled: number;
    totalValuation: number;
    total_value?: number;
  };
}

// --- Reports & Analytics Module Types ---

export interface ReportOverview {
  totalProducts: number;
  totalInventoryQuantity: number;
  totalInventoryValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalSuppliers: number;
  totalCustomers: number;
  totalPurchaseOrders: number;
  totalSalesOrders: number;
  totalReceipts: number;
  totalDeliveries: number;
  totalInternalTransfers: number;
  totalAdjustments: number;
}

export interface InventoryReport {
  totalStockQuantity: number;
  inventoryValue: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockByWarehouse: { warehouse_code: string; warehouse_name: string; total_stock: number }[];
  stockByCategory: { category: string; total_stock: number; product_count: number }[];
  topStockedProducts: Product[];
  lowStockProducts: (Product & { min_stock_level: number })[];
  outOfStockProducts: (Product & { min_stock_level: number })[];
}

export interface PurchaseReport {
  purchaseOrderCount: number;
  completedPurchaseOrders: number;
  pendingPurchaseOrders: number;
  purchaseValue: number;
  purchaseByMonth: { month: string; value: number; order_count: number }[];
  purchaseBySupplier: { supplier_name: string; total_value: number; order_count: number }[];
  topSuppliers: { supplier_name: string; total_value: number; order_count: number }[];
  recentPurchaseOrders: {
    id: number; reference: string; order_date: string; expected_date: string;
    grand_total: number; status: string; warehouse_code: string; supplier_name: string;
  }[];
}

export interface SalesReport {
  salesOrderCount: number;
  completedSalesOrders: number;
  pendingSalesOrders: number;
  totalSalesValue: number;
  salesByMonth: { month: string; value: number; order_count: number }[];
  salesByCustomer: { customer_name: string; total_value: number; order_count: number }[];
  topCustomers: { customer_name: string; total_value: number; order_count: number }[];
  recentSalesOrders: {
    id: number; reference: string; customer: string; order_date: string;
    expected_date: string; grand_total: number; status: string; warehouse_code: string;
  }[];
}

export interface MovementReport {
  receipts: { count: number; totalQuantity: number };
  deliveries: { count: number; totalQuantity: number };
  internalTransfers: { count: number; totalQuantity: number };
  adjustments: { count: number; increaseQuantity: number; decreaseQuantity: number };
  totalInboundQuantity: number;
  totalOutboundQuantity: number;
  netInventoryMovement: number;
  movementTrends: {
    month: string; receipts: number; deliveries: number;
    transfers: number; adjustments: number;
  }[];
}

export interface WarehouseReportItem {
  warehouse_code: string;
  warehouse_name: string;
  location: string;
  capacity: number;
  total_stock: number;
  inventory_value: number;
  product_count: number;
  total_inbound: number;
  total_outbound: number;
  utilization: number;
}

export interface WarehouseReport {
  warehouseStock: { warehouse_code: string; warehouse_name: string; location: string; capacity: number; total_stock: number; inventory_value: number; product_count: number }[];
  warehouseInbound: { warehouse_code: string; total_inbound: number }[];
  warehouseOutbound: { warehouse_code: string; total_outbound: number }[];
  warehouseActivitySummary: WarehouseReportItem[];
}

export type ReportTab = 'overview' | 'inventory' | 'purchases' | 'sales' | 'movements' | 'warehouses';

export interface ReportFilterState {
  dateFrom: string;
  dateTo: string;
  warehouse: string;
  activeTab: ReportTab;
}
