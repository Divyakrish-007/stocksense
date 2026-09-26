const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// ─── Helper: safe date filtering clause ──────────────────────────────────────
function dateClause(column, dateFrom, dateTo) {
  const parts = [];
  const params = [];
  if (dateFrom) {
    parts.push(`${column} >= ?`);
    params.push(dateFrom);
  }
  if (dateTo) {
    parts.push(`${column} <= ?`);
    params.push(dateTo);
  }
  return { clause: parts.length ? ' AND ' + parts.join(' AND ') : '', params };
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/overview — System-wide KPI summary
// ═════════════════════════════════════════════════════════════════════════════
router.get('/overview', authenticateToken, (req, res) => {
  try {
    const products = db.prepare(`
      SELECT
        COUNT(*) AS total_products,
        COALESCE(SUM(quantity), 0) AS total_inventory_quantity,
        COALESCE(SUM(quantity * unit_price), 0) AS total_inventory_value,
        COUNT(CASE WHEN quantity > 0 AND quantity <= min_stock_level THEN 1 END) AS low_stock_products,
        COUNT(CASE WHEN quantity = 0 THEN 1 END) AS out_of_stock_products
      FROM products
    `).get();

    const suppliers = db.prepare('SELECT COUNT(*) AS total FROM suppliers').get();
    const customers = db.prepare('SELECT COUNT(DISTINCT customer) AS total FROM sales_orders').get();

    const purchaseOrders = db.prepare('SELECT COUNT(*) AS total FROM purchase_orders').get();
    const salesOrders = db.prepare('SELECT COUNT(*) AS total FROM sales_orders').get();
    const receipts = db.prepare('SELECT COUNT(*) AS total FROM receipts').get();
    const deliveries = db.prepare('SELECT COUNT(*) AS total FROM delivery_orders').get();
    const transfers = db.prepare('SELECT COUNT(*) AS total FROM internal_transfers').get();
    const adjustments = db.prepare('SELECT COUNT(*) AS total FROM inventory_adjustments').get();

    res.json({
      totalProducts: products.total_products,
      totalInventoryQuantity: products.total_inventory_quantity,
      totalInventoryValue: Math.round(products.total_inventory_value * 100) / 100,
      lowStockProducts: products.low_stock_products,
      outOfStockProducts: products.out_of_stock_products,
      totalSuppliers: suppliers.total,
      totalCustomers: customers.total,
      totalPurchaseOrders: purchaseOrders.total,
      totalSalesOrders: salesOrders.total,
      totalReceipts: receipts.total,
      totalDeliveries: deliveries.total,
      totalInternalTransfers: transfers.total,
      totalAdjustments: adjustments.total,
    });
  } catch (error) {
    console.error('[Reports] Overview error:', error.message);
    res.status(500).json({ message: 'Failed to generate overview report' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/inventory — Inventory analytics
// ═════════════════════════════════════════════════════════════════════════════
router.get('/inventory', authenticateToken, (req, res) => {
  try {
    const { warehouse } = req.query;

    let warehouseFilter = '';
    const warehouseParams = [];
    if (warehouse && warehouse !== 'All') {
      warehouseFilter = ' WHERE p.warehouse_code = ?';
      warehouseParams.push(warehouse);
    }

    // Summary stats
    const summary = db.prepare(`
      SELECT
        COALESCE(SUM(p.quantity), 0) AS total_stock_quantity,
        COALESCE(SUM(p.quantity * p.unit_price), 0) AS inventory_value,
        COUNT(CASE WHEN p.status = 'In Stock' THEN 1 END) AS in_stock_count,
        COUNT(CASE WHEN p.status = 'Low Stock' THEN 1 END) AS low_stock_count,
        COUNT(CASE WHEN p.status = 'Out of Stock' THEN 1 END) AS out_of_stock_count
      FROM products p ${warehouseFilter}
    `).get(...warehouseParams);

    // Stock by warehouse
    const stockByWarehouse = db.prepare(`
      SELECT
        pws.warehouse_code,
        w.name AS warehouse_name,
        COALESCE(SUM(pws.quantity), 0) AS total_stock
      FROM product_warehouse_stock pws
      LEFT JOIN warehouses w ON pws.warehouse_code = w.code
      GROUP BY pws.warehouse_code
      ORDER BY total_stock DESC
    `).all();

    // Stock by category
    const stockByCategory = db.prepare(`
      SELECT
        p.category,
        COALESCE(SUM(p.quantity), 0) AS total_stock,
        COUNT(*) AS product_count
      FROM products p ${warehouseFilter}
      GROUP BY p.category
      ORDER BY total_stock DESC
    `).all(...warehouseParams);

    // Top stocked products
    const topStockedProducts = db.prepare(`
      SELECT p.id, p.sku, p.name, p.category, p.quantity, p.unit_price, p.warehouse_code, p.status
      FROM products p ${warehouseFilter}
      ORDER BY p.quantity DESC
      LIMIT 10
    `).all(...warehouseParams);

    // Low stock products
    const lowStockProducts = db.prepare(`
      SELECT p.id, p.sku, p.name, p.category, p.quantity, p.min_stock_level, p.unit_price, p.warehouse_code
      FROM products p
      ${warehouseFilter ? warehouseFilter + ' AND' : ' WHERE'} p.quantity > 0 AND p.quantity <= p.min_stock_level
      ORDER BY p.quantity ASC
      LIMIT 10
    `).all(...warehouseParams);

    // Out of stock products
    const outOfStockProducts = db.prepare(`
      SELECT p.id, p.sku, p.name, p.category, p.min_stock_level, p.unit_price, p.warehouse_code
      FROM products p
      ${warehouseFilter ? warehouseFilter + ' AND' : ' WHERE'} p.quantity = 0
      ORDER BY p.name ASC
      LIMIT 10
    `).all(...warehouseParams);

    res.json({
      totalStockQuantity: summary.total_stock_quantity,
      inventoryValue: Math.round(summary.inventory_value * 100) / 100,
      inStockCount: summary.in_stock_count,
      lowStockCount: summary.low_stock_count,
      outOfStockCount: summary.out_of_stock_count,
      stockByWarehouse,
      stockByCategory,
      topStockedProducts,
      lowStockProducts,
      outOfStockProducts,
    });
  } catch (error) {
    console.error('[Reports] Inventory error:', error.message);
    res.status(500).json({ message: 'Failed to generate inventory report' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/purchases — Purchase order analytics
// ═════════════════════════════════════════════════════════════════════════════
router.get('/purchases', authenticateToken, (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const df = dateClause('po.order_date', dateFrom, dateTo);

    const summary = db.prepare(`
      SELECT
        COUNT(*) AS purchase_order_count,
        COUNT(CASE WHEN po.status = 'Done' THEN 1 END) AS completed_purchase_orders,
        COUNT(CASE WHEN po.status IN ('Draft', 'Waiting', 'Ready') THEN 1 END) AS pending_purchase_orders,
        COALESCE(SUM(po.grand_total), 0) AS purchase_value
      FROM purchase_orders po
      WHERE 1=1 ${df.clause}
    `).get(...df.params);

    // Purchase value by month
    const purchaseByMonth = db.prepare(`
      SELECT
        substr(po.order_date, 1, 7) AS month,
        COALESCE(SUM(po.grand_total), 0) AS value,
        COUNT(*) AS order_count
      FROM purchase_orders po
      WHERE 1=1 ${df.clause}
      GROUP BY month
      ORDER BY month ASC
    `).all(...df.params);

    // Purchase value by supplier
    const purchaseBySupplier = db.prepare(`
      SELECT
        s.name AS supplier_name,
        COALESCE(SUM(po.grand_total), 0) AS total_value,
        COUNT(po.id) AS order_count
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE 1=1 ${df.clause}
      GROUP BY s.id
      ORDER BY total_value DESC
      LIMIT 10
    `).all(...df.params);

    // Recent purchase orders
    const recentPurchaseOrders = db.prepare(`
      SELECT po.id, po.reference, po.order_date, po.expected_date, po.grand_total, po.status, po.warehouse_code,
        s.name AS supplier_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE 1=1 ${df.clause}
      ORDER BY po.id DESC
      LIMIT 10
    `).all(...df.params);

    res.json({
      purchaseOrderCount: summary.purchase_order_count,
      completedPurchaseOrders: summary.completed_purchase_orders,
      pendingPurchaseOrders: summary.pending_purchase_orders,
      purchaseValue: Math.round(summary.purchase_value * 100) / 100,
      purchaseByMonth,
      purchaseBySupplier,
      topSuppliers: purchaseBySupplier,
      recentPurchaseOrders,
    });
  } catch (error) {
    console.error('[Reports] Purchases error:', error.message);
    res.status(500).json({ message: 'Failed to generate purchase report' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/sales — Sales order analytics
// ═════════════════════════════════════════════════════════════════════════════
router.get('/sales', authenticateToken, (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const df = dateClause('so.order_date', dateFrom, dateTo);

    const summary = db.prepare(`
      SELECT
        COUNT(*) AS sales_order_count,
        COUNT(CASE WHEN so.status = 'Done' THEN 1 END) AS completed_sales_orders,
        COUNT(CASE WHEN so.status IN ('Draft', 'Waiting', 'Ready') THEN 1 END) AS pending_sales_orders,
        COALESCE(SUM(so.grand_total), 0) AS total_sales_value
      FROM sales_orders so
      WHERE 1=1 ${df.clause}
    `).get(...df.params);

    // Sales value by month
    const salesByMonth = db.prepare(`
      SELECT
        substr(so.order_date, 1, 7) AS month,
        COALESCE(SUM(so.grand_total), 0) AS value,
        COUNT(*) AS order_count
      FROM sales_orders so
      WHERE 1=1 ${df.clause}
      GROUP BY month
      ORDER BY month ASC
    `).all(...df.params);

    // Sales value by customer
    const salesByCustomer = db.prepare(`
      SELECT
        so.customer AS customer_name,
        COALESCE(SUM(so.grand_total), 0) AS total_value,
        COUNT(so.id) AS order_count
      FROM sales_orders so
      WHERE 1=1 ${df.clause}
      GROUP BY so.customer
      ORDER BY total_value DESC
      LIMIT 10
    `).all(...df.params);

    // Recent sales orders
    const recentSalesOrders = db.prepare(`
      SELECT so.id, so.reference, so.customer, so.order_date, so.expected_date, so.grand_total, so.status, so.warehouse_code
      FROM sales_orders so
      WHERE 1=1 ${df.clause}
      ORDER BY so.id DESC
      LIMIT 10
    `).all(...df.params);

    res.json({
      salesOrderCount: summary.sales_order_count,
      completedSalesOrders: summary.completed_sales_orders,
      pendingSalesOrders: summary.pending_sales_orders,
      totalSalesValue: Math.round(summary.total_sales_value * 100) / 100,
      salesByMonth,
      salesByCustomer,
      topCustomers: salesByCustomer,
      recentSalesOrders,
    });
  } catch (error) {
    console.error('[Reports] Sales error:', error.message);
    res.status(500).json({ message: 'Failed to generate sales report' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/movements — Inbound/outbound movement analytics
// ═════════════════════════════════════════════════════════════════════════════
router.get('/movements', authenticateToken, (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    // Receipts count & quantity
    const dfR = dateClause('r.scheduled_date', dateFrom, dateTo);
    const receipts = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(ri.quantity), 0) AS total_qty
      FROM receipts r
      LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
      WHERE r.status = 'Done' ${dfR.clause}
    `).get(...dfR.params);

    // Deliveries count & quantity
    const dfD = dateClause('d.scheduled_date', dateFrom, dateTo);
    const deliveries = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(di.quantity), 0) AS total_qty
      FROM delivery_orders d
      LEFT JOIN delivery_order_items di ON di.delivery_order_id = d.id
      WHERE d.status = 'Done' ${dfD.clause}
    `).get(...dfD.params);

    // Internal transfers
    const dfT = dateClause('t.scheduled_date', dateFrom, dateTo);
    const transfers = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(ti.quantity), 0) AS total_qty
      FROM internal_transfers t
      LEFT JOIN internal_transfer_items ti ON ti.internal_transfer_id = t.id
      WHERE t.status = 'Done' ${dfT.clause}
    `).get(...dfT.params);

    // Adjustments
    const dfA = dateClause('a.created_at', dateFrom, dateTo);
    const adjustments = db.prepare(`
      SELECT COUNT(*) AS count,
        COALESCE(SUM(CASE WHEN a.adjustment_type = 'Increase' THEN ai.quantity ELSE 0 END), 0) AS increase_qty,
        COALESCE(SUM(CASE WHEN a.adjustment_type = 'Decrease' THEN ai.quantity ELSE 0 END), 0) AS decrease_qty
      FROM inventory_adjustments a
      LEFT JOIN inventory_adjustment_items ai ON ai.adjustment_id = a.id
      WHERE a.status = 'Done' ${dfA.clause}
    `).get(...dfA.params);

    const totalInbound = receipts.total_qty + adjustments.increase_qty;
    const totalOutbound = deliveries.total_qty + adjustments.decrease_qty;

    // Movement trends by month from inventory_activities
    const dfM = dateClause('ia.scheduled_date', dateFrom, dateTo);
    const movementTrends = db.prepare(`
      SELECT
        substr(ia.scheduled_date, 1, 7) AS month,
        COUNT(CASE WHEN ia.type = 'Receipts' THEN 1 END) AS receipts,
        COUNT(CASE WHEN ia.type = 'Delivery' THEN 1 END) AS deliveries,
        COUNT(CASE WHEN ia.type = 'Internal' THEN 1 END) AS transfers,
        COUNT(CASE WHEN ia.type = 'Adjustments' THEN 1 END) AS adjustments
      FROM inventory_activities ia
      WHERE ia.status = 'Done' ${dfM.clause}
      GROUP BY month
      ORDER BY month ASC
    `).all(...dfM.params);

    res.json({
      receipts: { count: receipts.count, totalQuantity: receipts.total_qty },
      deliveries: { count: deliveries.count, totalQuantity: deliveries.total_qty },
      internalTransfers: { count: transfers.count, totalQuantity: transfers.total_qty },
      adjustments: {
        count: adjustments.count,
        increaseQuantity: adjustments.increase_qty,
        decreaseQuantity: adjustments.decrease_qty,
      },
      totalInboundQuantity: totalInbound,
      totalOutboundQuantity: totalOutbound,
      netInventoryMovement: totalInbound - totalOutbound,
      movementTrends,
    });
  } catch (error) {
    console.error('[Reports] Movements error:', error.message);
    res.status(500).json({ message: 'Failed to generate movement report' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/warehouses — Warehouse analytics
// ═════════════════════════════════════════════════════════════════════════════
router.get('/warehouses', authenticateToken, (req, res) => {
  try {
    // Warehouse-wise stock
    const warehouseStock = db.prepare(`
      SELECT
        w.code AS warehouse_code,
        w.name AS warehouse_name,
        w.location,
        w.capacity,
        COALESCE(SUM(pws.quantity), 0) AS total_stock,
        COALESCE(SUM(pws.quantity * p.unit_price), 0) AS inventory_value,
        COUNT(DISTINCT pws.product_id) AS product_count
      FROM warehouses w
      LEFT JOIN product_warehouse_stock pws ON w.code = pws.warehouse_code
      LEFT JOIN products p ON pws.product_id = p.id
      GROUP BY w.code
      ORDER BY total_stock DESC
    `).all();

    // Warehouse-wise inbound (completed receipts)
    const warehouseInbound = db.prepare(`
      SELECT
        r.warehouse_code,
        COALESCE(SUM(ri.quantity), 0) AS total_inbound
      FROM receipts r
      JOIN receipt_items ri ON ri.receipt_id = r.id
      WHERE r.status = 'Done'
      GROUP BY r.warehouse_code
    `).all();

    // Warehouse-wise outbound (completed deliveries)
    const warehouseOutbound = db.prepare(`
      SELECT
        d.warehouse_code,
        COALESCE(SUM(di.quantity), 0) AS total_outbound
      FROM delivery_orders d
      JOIN delivery_order_items di ON di.delivery_order_id = d.id
      WHERE d.status = 'Done'
      GROUP BY d.warehouse_code
    `).all();

    // Build inbound/outbound maps
    const inboundMap = {};
    warehouseInbound.forEach((w) => { inboundMap[w.warehouse_code] = w.total_inbound; });
    const outboundMap = {};
    warehouseOutbound.forEach((w) => { outboundMap[w.warehouse_code] = w.total_outbound; });

    // Combine into activity summary
    const warehouseActivitySummary = warehouseStock.map((ws) => ({
      ...ws,
      inventory_value: Math.round(ws.inventory_value * 100) / 100,
      total_inbound: inboundMap[ws.warehouse_code] || 0,
      total_outbound: outboundMap[ws.warehouse_code] || 0,
      utilization: ws.capacity > 0
        ? Math.round((ws.total_stock / ws.capacity) * 10000) / 100
        : 0,
    }));

    res.json({
      warehouseStock,
      warehouseInbound,
      warehouseOutbound,
      warehouseActivitySummary,
    });
  } catch (error) {
    console.error('[Reports] Warehouses error:', error.message);
    res.status(500).json({ message: 'Failed to generate warehouse report' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/export — Export report data
// ═════════════════════════════════════════════════════════════════════════════
router.get('/export', authenticateToken, (req, res) => {
  try {
    const { type, dateFrom, dateTo, format } = req.query;

    if (!type) {
      return res.status(400).json({ message: 'Report type is required (inventory, purchases, sales, movements, warehouses)' });
    }

    let data;
    let filename;

    switch (type) {
      case 'inventory': {
        data = db.prepare(`
          SELECT p.sku, p.name, p.category, p.quantity, p.min_stock_level, p.unit_price,
            p.warehouse_code, p.status, (p.quantity * p.unit_price) AS total_value
          FROM products p
          ORDER BY p.name ASC
        `).all();
        filename = 'StockSense_Inventory_Report';
        break;
      }
      case 'purchases': {
        const df = dateClause('po.order_date', dateFrom, dateTo);
        data = db.prepare(`
          SELECT po.reference, s.name AS supplier_name, po.warehouse_code,
            po.order_date, po.expected_date, po.grand_total, po.status
          FROM purchase_orders po
          JOIN suppliers s ON po.supplier_id = s.id
          WHERE 1=1 ${df.clause}
          ORDER BY po.order_date DESC
        `).all(...df.params);
        filename = 'StockSense_Purchase_Report';
        break;
      }
      case 'sales': {
        const df = dateClause('so.order_date', dateFrom, dateTo);
        data = db.prepare(`
          SELECT so.reference, so.customer, so.warehouse_code,
            so.order_date, so.expected_date, so.grand_total, so.status
          FROM sales_orders so
          WHERE 1=1 ${df.clause}
          ORDER BY so.order_date DESC
        `).all(...df.params);
        filename = 'StockSense_Sales_Report';
        break;
      }
      case 'movements': {
        const df = dateClause('ia.scheduled_date', dateFrom, dateTo);
        data = db.prepare(`
          SELECT ia.reference, ia.type, ia.contact, ia.source_location, ia.dest_location,
            ia.category, ia.items_count, ia.scheduled_date, ia.status
          FROM inventory_activities ia
          WHERE 1=1 ${df.clause}
          ORDER BY ia.scheduled_date DESC
        `).all(...df.params);
        filename = 'StockSense_Movement_Report';
        break;
      }
      case 'warehouses': {
        data = db.prepare(`
          SELECT w.code, w.name, w.location, w.capacity,
            COALESCE(SUM(pws.quantity), 0) AS total_stock,
            COUNT(DISTINCT pws.product_id) AS product_count,
            COALESCE(SUM(pws.quantity * p.unit_price), 0) AS inventory_value
          FROM warehouses w
          LEFT JOIN product_warehouse_stock pws ON w.code = pws.warehouse_code
          LEFT JOIN products p ON pws.product_id = p.id
          GROUP BY w.code
          ORDER BY w.name ASC
        `).all();
        filename = 'StockSense_Warehouse_Report';
        break;
      }
      default:
        return res.status(400).json({ message: `Invalid report type: ${type}. Valid: inventory, purchases, sales, movements, warehouses` });
    }

    // Return JSON data — frontend handles CSV conversion and file download
    if (format === 'csv') {
      if (!data || data.length === 0) {
        return res.json({ filename: `${filename}.csv`, data: [], csv: '' });
      }
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers.map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"` : str;
          }).join(',')
        ),
      ];
      return res.json({ filename: `${filename}.csv`, data, csv: csvRows.join('\n') });
    }

    res.json({ filename: `${filename}.json`, data });
  } catch (error) {
    console.error('[Reports] Export error:', error.message);
    res.status(500).json({ message: 'Failed to export report data' });
  }
});

module.exports = router;
