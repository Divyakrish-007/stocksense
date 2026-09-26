const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// ─── Helper: recompute & persist product stock status ─────────────────────────
function syncProductStatus(productId) {
  const prod = db.prepare('SELECT quantity, min_stock_level FROM products WHERE id = ?').get(productId);
  if (!prod) return;
  const qty = prod.quantity;
  const minStock = prod.min_stock_level;
  const status = qty === 0 ? 'Out of Stock' : qty <= minStock ? 'Low Stock' : 'In Stock';
  db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, productId);
}

// ─── Helper: build a full delivery order object from a row ────────────────────
function buildDeliveryOrder(row) {
  const items = db
    .prepare(`
      SELECT
        doi.id,
        doi.product_id,
        doi.quantity,
        p.sku,
        p.name   AS product_name,
        p.category,
        p.quantity AS available_stock,
        p.unit_price
      FROM delivery_order_items doi
      JOIN products p ON doi.product_id = p.id
      WHERE doi.delivery_order_id = ?
      ORDER BY doi.id ASC
    `)
    .all(row.id);

  return { ...row, items };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/delivery-orders/meta
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/meta', authenticateToken, (req, res) => {
  try {
    const warehouses = db
      .prepare('SELECT code, name, location FROM warehouses ORDER BY code ASC')
      .all();

    const stats = db
      .prepare(`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status IN ('Draft','Waiting','Ready') THEN 1 END) AS pending,
          COUNT(CASE WHEN status = 'Done'     THEN 1 END) AS done,
          COUNT(CASE WHEN status = 'Canceled' THEN 1 END) AS canceled
        FROM delivery_orders
      `)
      .get();

    return res.json({ warehouses, stats });
  } catch (err) {
    console.error('delivery-orders/meta error:', err);
    return res.status(500).json({ message: 'Failed to retrieve delivery orders metadata' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/delivery-orders  – list with search / filter / sort
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, status, warehouse, dateFrom, dateTo, sortBy, order } = req.query;

    let sql = `
      SELECT
        do.id,
        do.reference,
        do.customer,
        do.warehouse_code,
        do.destination_address,
        do.scheduled_date,
        do.status,
        do.notes,
        do.created_at,
        w.name   AS warehouse_name,
        w.location AS warehouse_location,
        (SELECT COUNT(*) FROM delivery_order_items doi WHERE doi.delivery_order_id = do.id) AS item_lines,
        (SELECT COALESCE(SUM(doi.quantity),0) FROM delivery_order_items doi WHERE doi.delivery_order_id = do.id) AS total_qty
      FROM delivery_orders do
      LEFT JOIN warehouses w ON do.warehouse_code = w.code
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const t = `%${search.trim()}%`;
      sql += ' AND (do.reference LIKE ? OR do.customer LIKE ? OR do.destination_address LIKE ? OR do.notes LIKE ?)';
      params.push(t, t, t, t);
    }
    if (status && status !== 'All') {
      sql += ' AND do.status = ?';
      params.push(status);
    }
    if (warehouse && warehouse !== 'All') {
      sql += ' AND do.warehouse_code = ?';
      params.push(warehouse);
    }
    if (dateFrom) {
      sql += ' AND do.scheduled_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND do.scheduled_date <= ?';
      params.push(dateTo);
    }

    const allowedSort = ['id', 'reference', 'customer', 'scheduled_date', 'status'];
    const sortField   = allowedSort.includes(sortBy) ? `do.${sortBy}` : 'do.id';
    const sortOrder   = order === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortField} ${sortOrder}`;

    const deliveryOrders = db.prepare(sql).all(...params);
    return res.json({ count: deliveryOrders.length, deliveryOrders });
  } catch (err) {
    console.error('GET /delivery-orders error:', err);
    return res.status(500).json({ message: 'Failed to retrieve delivery orders' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/delivery-orders/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const row = db
      .prepare(`
        SELECT
          do.*,
          w.name AS warehouse_name,
          w.location AS warehouse_location,
          (SELECT COUNT(*) FROM delivery_order_items doi WHERE doi.delivery_order_id = do.id) AS item_lines,
          (SELECT COALESCE(SUM(doi.quantity),0) FROM delivery_order_items doi WHERE doi.delivery_order_id = do.id) AS total_qty
        FROM delivery_orders do
        LEFT JOIN warehouses w ON do.warehouse_code = w.code
        WHERE do.id = ?
      `)
      .get(req.params.id);

    if (!row) return res.status(404).json({ message: 'Delivery order not found' });
    return res.json({ deliveryOrder: buildDeliveryOrder(row) });
  } catch (err) {
    console.error('GET /delivery-orders/:id error:', err);
    return res.status(500).json({ message: 'Failed to retrieve delivery order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/delivery-orders  – create
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticateToken, (req, res) => {
  try {
    const { customer, warehouseCode, destinationAddress, scheduledDate, status, notes, items } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!customer || !customer.trim())
      return res.status(400).json({ message: 'Customer / partner name is required' });
    if (!warehouseCode || !warehouseCode.trim())
      return res.status(400).json({ message: 'Source warehouse is required' });
    if (!destinationAddress || !destinationAddress.trim())
      return res.status(400).json({ message: 'Destination / shipping address is required' });
    if (!scheduledDate)
      return res.status(400).json({ message: 'Scheduled delivery date is required' });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'At least one product line item is required' });

    const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(warehouseCode.trim());
    if (!wh) return res.status(400).json({ message: `Invalid warehouse code: ${warehouseCode}` });

    for (const item of items) {
      if (!item.productId) return res.status(400).json({ message: 'Each item must have a product' });
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)
        return res.status(400).json({ message: 'Each item quantity must be a positive integer' });
      const prod = db.prepare('SELECT id, sku, name, quantity FROM products WHERE id = ?').get(item.productId);
      if (!prod) return res.status(400).json({ message: `Product ID ${item.productId} not found` });
    }

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    const cleanStatus = validStatuses.includes(status) ? status : 'Draft';

    // If created as Done, verify stock sufficiency
    if (cleanStatus === 'Done') {
      for (const item of items) {
        const prod = db.prepare('SELECT id, sku, name, quantity FROM products WHERE id = ?').get(item.productId);
        const reqQty = Math.floor(Number(item.quantity));
        if (prod.quantity < reqQty) {
          return res.status(400).json({
            message: `Insufficient stock for product [${prod.sku}] "${prod.name}". Available: ${prod.quantity}, Requested: ${reqQty}`,
          });
        }
      }
    }

    // ── Auto-generate reference ──────────────────────────────────────────────
    const year = new Date().getFullYear();
    const seq  = Math.floor(1000 + Math.random() * 9000);
    const reference = `DO-${year}-${seq}`;

    // ── Transactional insert ─────────────────────────────────────────────────
    const createDO = db.transaction(() => {
      const result = db
        .prepare(`
          INSERT INTO delivery_orders (reference, customer, warehouse_code, destination_address, scheduled_date, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(reference, customer.trim(), warehouseCode.trim(), destinationAddress.trim(), scheduledDate, cleanStatus, notes || '');

      const doId = result.lastInsertRowid;

      for (const item of items) {
        db.prepare(`
          INSERT INTO delivery_order_items (delivery_order_id, product_id, quantity)
          VALUES (?, ?, ?)
        `).run(doId, Number(item.productId), Math.floor(Number(item.quantity)));
      }

      // If status is Done on creation, deduct stock immediately
      if (cleanStatus === 'Done') {
        for (const item of items) {
          const qtyToDeduct = Math.floor(Number(item.quantity));
          db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?')
            .run(qtyToDeduct, Number(item.productId));
          syncProductStatus(Number(item.productId));
        }
      }

      // Record activity in inventory_activities for Dashboard synchronization
      const totalUnits = items.reduce((s, i) => s + Math.floor(Number(i.quantity)), 0);
      db.prepare(`
        INSERT INTO inventory_activities
          (reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes)
        VALUES (?, 'Delivery', ?, ?, ?, 'Outbound Orders', ?, ?, ?, ?)
      `).run(reference, customer.trim(), warehouseCode.trim(), destinationAddress.trim(),
             totalUnits, scheduledDate, cleanStatus, notes || '');

      return doId;
    });

    const doId = createDO();

    const row = db
      .prepare(`
        SELECT do.*, w.name AS warehouse_name, w.location AS warehouse_location,
          (SELECT COUNT(*) FROM delivery_order_items doi WHERE doi.delivery_order_id = do.id) AS item_lines,
          (SELECT COALESCE(SUM(doi.quantity),0) FROM delivery_order_items doi WHERE doi.delivery_order_id = do.id) AS total_qty
        FROM delivery_orders do LEFT JOIN warehouses w ON do.warehouse_code = w.code
        WHERE do.id = ?
      `)
      .get(doId);

    return res.status(201).json({ message: 'Delivery order created successfully', deliveryOrder: buildDeliveryOrder(row) });
  } catch (err) {
    console.error('POST /delivery-orders error:', err);
    return res.status(500).json({ message: err.message || 'Failed to create delivery order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/delivery-orders/:id  – update (full update incl. status transition)
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Delivery order not found' });

    // Protect against modifying or duplicate processing of already Done delivery orders
    if (existing.status === 'Done') {
      return res.status(400).json({
        message: 'A completed delivery order is finalized and cannot be modified or re-processed',
      });
    }

    const { customer, warehouseCode, destinationAddress, scheduledDate, status, notes, items } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (customer !== undefined && !customer.trim())
      return res.status(400).json({ message: 'Customer name cannot be empty' });
    if (destinationAddress !== undefined && !destinationAddress.trim())
      return res.status(400).json({ message: 'Destination address cannot be empty' });
    if (warehouseCode !== undefined) {
      const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(warehouseCode.trim());
      if (!wh) return res.status(400).json({ message: `Invalid warehouse code: ${warehouseCode}` });
    }

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    if (status !== undefined && !validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid status value' });

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0)
        return res.status(400).json({ message: 'At least one line item is required' });
      for (const item of items) {
        if (!item.productId) return res.status(400).json({ message: 'Each item must have a product' });
        if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)
          return res.status(400).json({ message: 'Item quantity must be a positive integer' });
        const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(item.productId);
        if (!prod) return res.status(400).json({ message: `Product ID ${item.productId} not found` });
      }
    }

    const newStatus    = status             !== undefined ? status                    : existing.status;
    const newCustomer  = customer           !== undefined ? customer.trim()           : existing.customer;
    const newWH        = warehouseCode      !== undefined ? warehouseCode.trim()      : existing.warehouse_code;
    const newDest      = destinationAddress !== undefined ? destinationAddress.trim() : existing.destination_address;
    const newDate      = scheduledDate      !== undefined ? scheduledDate             : existing.scheduled_date;
    const newNotes     = notes              !== undefined ? notes                     : existing.notes;
    const becomingDone = newStatus === 'Done' && existing.status !== 'Done';

    // Line items to consider
    let lineItemsToCheck = [];
    if (items !== undefined) {
      lineItemsToCheck = items.map((it) => ({
        product_id: Number(it.productId),
        quantity: Math.floor(Number(it.quantity)),
      }));
    } else {
      lineItemsToCheck = db
        .prepare('SELECT product_id, quantity FROM delivery_order_items WHERE delivery_order_id = ?')
        .all(id);
    }

    // ── Pre-execution stock sufficiency check if becoming Done ──────────────
    if (becomingDone) {
      for (const li of lineItemsToCheck) {
        const prod = db.prepare('SELECT id, sku, name, quantity FROM products WHERE id = ?').get(li.product_id);
        if (!prod) {
          return res.status(400).json({ message: `Product ID ${li.product_id} no longer exists in inventory.` });
        }
        if (prod.quantity < li.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for product [${prod.sku}] "${prod.name}". Available: ${prod.quantity}, Required for delivery: ${li.quantity}`,
          });
        }
      }
    }

    // ── Execute atomic update ───────────────────────────────────────────────
    const doUpdate = db.transaction(() => {
      db.prepare(`
        UPDATE delivery_orders
        SET customer=?, warehouse_code=?, destination_address=?, scheduled_date=?, status=?, notes=?
        WHERE id=?
      `).run(newCustomer, newWH, newDest, newDate, newStatus, newNotes, id);

      // Replace line items if provided
      if (items !== undefined) {
        db.prepare('DELETE FROM delivery_order_items WHERE delivery_order_id = ?').run(id);
        for (const item of items) {
          db.prepare('INSERT INTO delivery_order_items (delivery_order_id, product_id, quantity) VALUES (?,?,?)')
            .run(Number(id), Number(item.productId), Math.floor(Number(item.quantity)));
        }
      }

      // Deduct stock if becoming Done
      if (becomingDone) {
        for (const li of lineItemsToCheck) {
          db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?')
            .run(li.quantity, li.product_id);
          syncProductStatus(li.product_id);
        }
      }

      // Sync the legacy inventory_activities row
      const totalUnits = lineItemsToCheck.reduce((s, i) => s + i.quantity, 0);
      db.prepare(`
        UPDATE inventory_activities
        SET status=?, contact=?, source_location=?, dest_location=?, scheduled_date=?, notes=?, items_count=?
        WHERE reference = ?
      `).run(newStatus, newCustomer, newWH, newDest, newDate, newNotes, totalUnits, existing.reference);
    });

    doUpdate();

    const row = db
      .prepare(`
        SELECT do.*, w.name AS warehouse_name, w.location AS warehouse_location,
          (SELECT COUNT(*) FROM delivery_order_items doi WHERE doi.delivery_order_id = do.id) AS item_lines,
          (SELECT COALESCE(SUM(doi.quantity),0) FROM delivery_order_items doi WHERE doi.delivery_order_id = do.id) AS total_qty
        FROM delivery_orders do LEFT JOIN warehouses w ON do.warehouse_code = w.code
        WHERE do.id = ?
      `)
      .get(id);

    return res.json({
      message: becomingDone
        ? 'Delivery order marked as Done — inventory stock deducted'
        : 'Delivery order updated successfully',
      deliveryOrder: buildDeliveryOrder(row),
    });
  } catch (err) {
    console.error('PATCH /delivery-orders/:id error:', err);
    return res.status(500).json({ message: err.message || 'Failed to update delivery order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/delivery-orders/:id  – cancel / delete
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Delivery order not found' });

    if (existing.status === 'Done') {
      return res.status(400).json({
        message: 'Completed delivery orders cannot be deleted — stock has already been dispatched',
      });
    }
    if (existing.status === 'Ready') {
      return res.status(400).json({
        message: 'Ready delivery orders must be canceled first before deletion',
      });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM delivery_order_items WHERE delivery_order_id = ?').run(id);
      db.prepare('DELETE FROM delivery_orders WHERE id = ?').run(id);
      db.prepare('DELETE FROM inventory_activities WHERE reference = ?').run(existing.reference);
    })();

    return res.json({ message: `Delivery order ${existing.reference} deleted`, id: Number(id) });
  } catch (err) {
    console.error('DELETE /delivery-orders/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete delivery order' });
  }
});

module.exports = router;
