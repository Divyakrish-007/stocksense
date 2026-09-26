const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// GET /api/dashboard/overview - Consolidated Executive Dashboard Data
router.get('/overview', authenticateToken, (req, res) => {
  try {
    // 1. Executive KPIs
    const prodStats = db.prepare(`
      SELECT
        COUNT(*) AS total_products,
        COALESCE(SUM(quantity), 0) AS total_stock_units,
        COALESCE(SUM(quantity * unit_price), 0) AS total_inventory_value,
        COUNT(CASE WHEN quantity > 0 AND quantity <= min_stock_level THEN 1 END) AS low_stock_items,
        COUNT(CASE WHEN quantity = 0 THEN 1 END) AS out_of_stock_items,
        COUNT(CASE WHEN quantity > min_stock_level THEN 1 END) AS in_stock_items
      FROM products
    `).get();

    const poStats = db.prepare(`
      SELECT
        COUNT(*) AS total_po,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) AS draft_po,
        COUNT(CASE WHEN status = 'Waiting' THEN 1 END) AS waiting_po,
        COUNT(CASE WHEN status = 'Ready' THEN 1 END) AS ready_po,
        COUNT(CASE WHEN status = 'Done' THEN 1 END) AS completed_po,
        COALESCE(SUM(grand_total), 0) AS total_po_value
      FROM purchase_orders
    `).get();

    const soStats = db.prepare(`
      SELECT
        COUNT(*) AS total_so,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) AS draft_so,
        COUNT(CASE WHEN status = 'Ready' THEN 1 END) AS ready_so,
        COUNT(CASE WHEN status = 'Done' THEN 1 END) AS completed_so,
        COALESCE(SUM(CASE WHEN status = 'Done' THEN grand_total ELSE 0 END), 0) AS total_so_revenue
      FROM sales_orders
    `).get();

    const supplierCount = db.prepare(`SELECT COUNT(*) AS c FROM suppliers WHERE status = 'Active'`).get().c;
    const customerCount = db.prepare(`SELECT COUNT(*) AS c FROM customers WHERE status = 'Active'`).get().c;

    const totalProducts = prodStats.total_products || 0;
    const inStock = prodStats.in_stock_items || 0;
    const healthPercentage = totalProducts > 0 ? Math.round((inStock / totalProducts) * 100) : 100;

    // Recent POs
    const recentPOs = db.prepare(`
      SELECT po.id, po.reference, po.warehouse_code, po.grand_total, po.status, po.order_date,
             s.name AS supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      ORDER BY po.id DESC
      LIMIT 5
    `).all();

    // Top Suppliers by procurement value
    const topSuppliers = db.prepare(`
      SELECT s.name AS supplier_name, COALESCE(SUM(po.grand_total), 0) AS total_value, COUNT(po.id) AS order_count
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      GROUP BY po.supplier_id
      ORDER BY total_value DESC
      LIMIT 5
    `).all();

    // Recent SOs
    const recentSOs = db.prepare(`
      SELECT id, reference, customer, warehouse_code, grand_total, status, order_date
      FROM sales_orders
      ORDER BY id DESC
      LIMIT 5
    `).all();

    // Top Customers by sales value
    const topCustomers = db.prepare(`
      SELECT customer AS customer_name, COALESCE(SUM(grand_total), 0) AS total_value, COUNT(id) AS order_count
      FROM sales_orders
      WHERE customer IS NOT NULL AND customer != ''
      GROUP BY customer
      ORDER BY total_value DESC
      LIMIT 5
    `).all();

    // Top Selling Products
    const topSellingProducts = db.prepare(`
      SELECT p.id, p.sku, p.name, COALESCE(SUM(soi.quantity), 0) AS total_qty_sold, COALESCE(SUM(soi.line_total), 0) AS total_revenue
      FROM sales_order_items soi
      JOIN products p ON p.id = soi.product_id
      GROUP BY p.id
      ORDER BY total_qty_sold DESC
      LIMIT 5
    `).all();

    // Warehouse Overview
    const warehousesList = db.prepare('SELECT code, name, location, capacity FROM warehouses ORDER BY code ASC').all();
    const warehouseData = warehousesList.map(w => {
      const stockRow = db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) AS total_stock, COUNT(DISTINCT product_id) AS product_count
        FROM product_warehouse_stock
        WHERE warehouse_code = ? AND quantity > 0
      `).get(w.code);

      const valRow = db.prepare(`
        SELECT COALESCE(SUM(pws.quantity * p.unit_price), 0) AS val
        FROM product_warehouse_stock pws
        JOIN products p ON p.id = pws.product_id
        WHERE pws.warehouse_code = ?
      `).get(w.code);

      let totalStock = stockRow?.total_stock || 0;
      let prodCount = stockRow?.product_count || 0;
      let invVal = valRow?.val || 0;

      // Fallback to products default warehouse if product_warehouse_stock empty
      if (totalStock === 0) {
        const fallback = db.prepare(`
          SELECT COALESCE(SUM(quantity), 0) AS total_stock, COUNT(*) AS product_count, COALESCE(SUM(quantity * unit_price), 0) AS val
          FROM products WHERE warehouse_code = ? AND quantity > 0
        `).get(w.code);
        totalStock = fallback?.total_stock || 0;
        prodCount = fallback?.product_count || 0;
        invVal = fallback?.val || 0;
      }

      const inboundCount = db.prepare(`
        SELECT COUNT(*) AS c FROM (
          SELECT id FROM receipts WHERE warehouse_code = ?
          UNION ALL
          SELECT id FROM purchase_orders WHERE warehouse_code = ?
        )
      `).get(w.code, w.code).c;

      const outboundCount = db.prepare(`
        SELECT COUNT(*) AS c FROM (
          SELECT id FROM delivery_orders WHERE warehouse_code = ?
          UNION ALL
          SELECT id FROM sales_orders WHERE warehouse_code = ?
        )
      `).get(w.code, w.code).c;

      const utilization = w.capacity > 0 ? Math.min(100, Math.round((totalStock / w.capacity) * 100)) : 0;

      return {
        warehouse_code: w.code,
        warehouse_name: w.name,
        location: w.location,
        capacity: w.capacity,
        total_stock: totalStock,
        inventory_value: Number(invVal.toFixed(2)),
        product_count: prodCount,
        inbound_movements: inboundCount,
        outbound_movements: outboundCount,
        utilization,
      };
    });

    // Stock Movement Analytics
    const receiptsMove = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(ri.quantity), 0) AS total_qty
      FROM receipts r
      LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
    `).get();

    const deliveriesMove = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(doi.quantity), 0) AS total_qty
      FROM delivery_orders do
      LEFT JOIN delivery_order_items doi ON doi.delivery_order_id = do.id
    `).get();

    const transfersMove = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(iti.quantity), 0) AS total_qty
      FROM internal_transfers it
      LEFT JOIN internal_transfer_items iti ON iti.internal_transfer_id = it.id
    `).get();

    const adjustmentsMove = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(abs(ia.adjusted_quantity - ia.previous_quantity)), 0) AS total_qty
      FROM inventory_adjustments adj
      LEFT JOIN inventory_adjustment_items ia ON ia.adjustment_id = adj.id
    `).get();

    // Low Stock Alerts
    const lowStockAlerts = db.prepare(`
      SELECT id, sku, name, category, quantity, min_stock_level, warehouse_code
      FROM products
      WHERE quantity <= min_stock_level
      ORDER BY (CASE WHEN quantity = 0 THEN 0 ELSE 1 END), quantity ASC
      LIMIT 10
    `).all().map(p => ({
      ...p,
      severity: p.quantity === 0 ? 'Critical' : (p.quantity <= p.min_stock_level / 2 ? 'High' : 'Medium'),
    }));

    // Recent Activities
    const recentActivities = db.prepare(`
      SELECT * FROM inventory_activities ORDER BY scheduled_date DESC, id DESC LIMIT 10
    `).all();

    return res.json({
      kpis: {
        totalInventoryValue: Number(prodStats.total_inventory_value.toFixed(2)),
        totalProducts,
        totalStockUnits: prodStats.total_stock_units,
        lowStockItems: prodStats.low_stock_items,
        outOfStockItems: prodStats.out_of_stock_items,
        purchaseOrders: poStats.total_po,
        salesOrders: soStats.total_so,
        activeSuppliers: supplierCount,
        activeCustomers: customerCount,
      },
      inventoryHealth: {
        inStock,
        lowStock: prodStats.low_stock_items,
        outOfStock: prodStats.out_of_stock_items,
        healthPercentage,
        totalValuation: Number(prodStats.total_inventory_value.toFixed(2)),
      },
      procurement: {
        draftPOs: poStats.draft_po,
        waitingPOs: poStats.waiting_po,
        readyPOs: poStats.ready_po,
        completedPOs: poStats.completed_po,
        totalProcurementValue: Number(poStats.total_po_value.toFixed(2)),
        recentPurchaseOrders: recentPOs,
        topSuppliers,
      },
      sales: {
        draftSOs: soStats.draft_so,
        readySOs: soStats.ready_so,
        completedSOs: soStats.completed_so,
        totalSalesRevenue: Number(soStats.total_so_revenue.toFixed(2)),
        recentSalesOrders: recentSOs,
        topCustomers,
        topSellingProducts,
      },
      warehouses: warehouseData,
      movements: {
        receipts: { count: receiptsMove.count, totalQuantity: receiptsMove.total_qty },
        deliveries: { count: deliveriesMove.count, totalQuantity: deliveriesMove.total_qty },
        internalTransfers: { count: transfersMove.count, totalQuantity: transfersMove.total_qty },
        adjustments: { count: adjustmentsMove.count, totalQuantity: adjustmentsMove.total_qty },
      },
      lowStockAlerts,
      recentActivities,
    });
  } catch (err) {
    console.error('GET /api/dashboard/overview error:', err);
    return res.status(500).json({ message: 'Failed to retrieve executive dashboard overview' });
  }
});

// GET /api/dashboard/stats - Real-time KPI metrics
router.get('/stats', authenticateToken, (req, res) => {
  try {
    // 1. Total Products in Stock
    const totalProductsQuery = db.prepare(`
      SELECT 
        COUNT(*) as total_sku_count,
        COALESCE(SUM(quantity), 0) as total_units,
        COALESCE(SUM(quantity * unit_price), 0) as total_valuation
      FROM products
      WHERE quantity > 0
    `).get();

    // 2. Low Stock / Out of Stock Items
    const stockAlertsQuery = db.prepare(`
      SELECT 
        COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock_count,
        COUNT(CASE WHEN quantity > 0 AND quantity <= min_stock_level THEN 1 END) as low_stock_count,
        COUNT(*) as total_alert_count
      FROM products
      WHERE quantity <= min_stock_level
    `).get();

    // 3. Pending Receipts (Draft, Waiting, Ready)
    const pendingReceiptsQuery = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(items_count), 0) as total_items
      FROM inventory_activities
      WHERE type = 'Receipts' AND status IN ('Draft', 'Waiting', 'Ready')
    `).get();

    // 4. Pending Deliveries (Draft, Waiting, Ready)
    const pendingDeliveriesQuery = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(items_count), 0) as total_items
      FROM inventory_activities
      WHERE type = 'Delivery' AND status IN ('Draft', 'Waiting', 'Ready')
    `).get();

    // 5. Internal Transfers Scheduled (Draft, Waiting, Ready)
    const internalTransfersQuery = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(items_count), 0) as total_items
      FROM inventory_activities
      WHERE type = 'Internal' AND status IN ('Draft', 'Waiting', 'Ready')
    `).get();

    return res.json({
      totalProductsInStock: {
        skuCount: totalProductsQuery.total_sku_count,
        totalUnits: totalProductsQuery.total_units,
        totalValuation: Math.round(totalProductsQuery.total_valuation),
      },
      lowStockAlerts: {
        total: stockAlertsQuery.total_alert_count,
        lowStock: stockAlertsQuery.low_stock_count,
        outOfStock: stockAlertsQuery.out_of_stock_count,
      },
      pendingReceipts: {
        count: pendingReceiptsQuery.count,
        items: pendingReceiptsQuery.total_items,
      },
      pendingDeliveries: {
        count: pendingDeliveriesQuery.count,
        items: pendingDeliveriesQuery.total_items,
      },
      internalTransfers: {
        count: internalTransfersQuery.count,
        items: internalTransfersQuery.total_items,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ message: 'Failed to retrieve dashboard statistics' });
  }
});

// GET /api/dashboard/activities - Filtered Recent Activities
router.get('/activities', authenticateToken, (req, res) => {
  try {
    const { type, status, warehouse, category, search } = req.query;

    let sql = 'SELECT * FROM inventory_activities WHERE 1=1';
    const params = [];

    if (type && type !== 'All') {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (status && status !== 'All') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (warehouse && warehouse !== 'All') {
      sql += ' AND (source_location = ? OR dest_location = ?)';
      params.push(warehouse, warehouse);
    }

    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      sql += ' AND (reference LIKE ? OR contact LIKE ? OR notes LIKE ? OR source_location LIKE ? OR dest_location LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY scheduled_date DESC, id DESC';

    const activities = db.prepare(sql).all(...params);

    return res.json({
      count: activities.length,
      activities,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return res.status(500).json({ message: 'Failed to retrieve inventory activities' });
  }
});

// GET /api/dashboard/filter-options - Distinct options for filter dropdowns
router.get('/filter-options', authenticateToken, (req, res) => {
  try {
    const warehouses = db.prepare('SELECT code, name, location FROM warehouses ORDER BY code ASC').all();
    const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category ASC').all().map(r => r.category);
    
    const types = ['Receipts', 'Delivery', 'Internal', 'Adjustments'];
    const statuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];

    return res.json({
      warehouses,
      categories,
      types,
      statuses,
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return res.status(500).json({ message: 'Failed to retrieve filter options' });
  }
});

// POST /api/dashboard/activities - Create new stock movement
router.post('/activities', authenticateToken, (req, res) => {
  try {
    const { type, contact, sourceLocation, destLocation, category, itemsCount, scheduledDate, status, notes } = req.body;

    if (!type || !contact || !sourceLocation || !destLocation || !category || itemsCount === undefined) {
      return res.status(400).json({ message: 'Missing required operation fields' });
    }

    // Auto-generate reference code based on type
    const prefixMap = {
      'Receipts': 'REC',
      'Delivery': 'DEL',
      'Internal': 'INT',
      'Adjustments': 'ADJ',
    };
    const prefix = prefixMap[type] || 'DOC';
    const year = new Date().getFullYear();
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const reference = `${prefix}-${year}-${randomSeq}`;

    const dateToUse = scheduledDate || new Date().toISOString().split('T')[0];
    const statusToUse = status || 'Draft';

    const insert = db.prepare(`
      INSERT INTO inventory_activities (
        reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      reference,
      type,
      contact,
      sourceLocation,
      destLocation,
      category,
      parseInt(itemsCount, 10),
      dateToUse,
      statusToUse,
      notes || ''
    );

    return res.status(201).json({
      message: 'Inventory operation logged successfully',
      reference,
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    return res.status(500).json({ message: 'Failed to create inventory activity' });
  }
});

// PATCH /api/dashboard/activities/:id/status - Quick update status
router.patch('/activities/:id/status', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const update = db.prepare('UPDATE inventory_activities SET status = ? WHERE id = ?').run(status, id);

    if (update.changes === 0) {
      return res.status(404).json({ message: 'Activity record not found' });
    }

    return res.json({ message: `Status updated to ${status}` });
  } catch (error) {
    console.error('Error updating activity status:', error);
    return res.status(500).json({ message: 'Failed to update activity status' });
  }
});

module.exports = router;
