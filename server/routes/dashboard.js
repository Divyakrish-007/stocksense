const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

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
