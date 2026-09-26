const express = require('express');
const router = express.Router();
const { db, getWarehouseStock, adjustWarehouseStock } = require('../db');
const { authenticateToken } = require('./auth');

// ─── Helper: build a full internal transfer object from a row ─────────────────
function buildInternalTransfer(row) {
  const items = db
    .prepare(`
      SELECT
        iti.id,
        iti.product_id,
        iti.quantity,
        p.sku,
        p.name   AS product_name,
        p.category,
        p.unit_price
      FROM internal_transfer_items iti
      JOIN products p ON iti.product_id = p.id
      WHERE iti.internal_transfer_id = ?
      ORDER BY iti.id ASC
    `)
    .all(row.id);

  // Attach real-time source and destination stock levels
  const enrichedItems = items.map((it) => ({
    ...it,
    source_stock: getWarehouseStock(it.product_id, row.source_warehouse_code),
    dest_stock:   getWarehouseStock(it.product_id, row.dest_warehouse_code),
  }));

  return { ...row, items: enrichedItems };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/internal-transfers/meta
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
        FROM internal_transfers
      `)
      .get();

    return res.json({ warehouses, stats });
  } catch (err) {
    console.error('internal-transfers/meta error:', err);
    return res.status(500).json({ message: 'Failed to retrieve internal transfers metadata' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/internal-transfers/stock  – warehouse stock query helper
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/stock', authenticateToken, (req, res) => {
  try {
    const warehouseCode = (req.query.warehouseCode || req.query.warehouse || '').trim();
    const productId = req.query.productId ? Number(req.query.productId) : null;

    if (!warehouseCode) {
      return res.status(400).json({ message: 'Warehouse code is required to query stock' });
    }

    if (productId) {
      const prod = db.prepare('SELECT id, sku, name FROM products WHERE id = ?').get(productId);
      if (!prod) return res.status(404).json({ message: 'Product not found' });
      const quantity = getWarehouseStock(productId, warehouseCode);
      return res.json({
        warehouseCode,
        productId,
        quantity,
        sku: prod.sku,
        productName: prod.name,
      });
    }

    // Return stock breakdown for all products in this warehouse
    const products = db.prepare('SELECT id, sku, name, category, unit_price FROM products ORDER BY name ASC').all();
    const stockList = products.map((p) => ({
      ...p,
      quantity: getWarehouseStock(p.id, warehouseCode),
    }));

    return res.json({ warehouseCode, stock: stockList, products: stockList });
  } catch (err) {
    console.error('internal-transfers/stock error:', err);
    return res.status(500).json({ message: 'Failed to retrieve warehouse stock' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/internal-transfers  – list with search / filter / sort
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, status, sourceWarehouse, destWarehouse, dateFrom, dateTo, sortBy, order } = req.query;

    let sql = `
      SELECT
        it.id,
        it.reference,
        it.source_warehouse_code,
        it.dest_warehouse_code,
        it.scheduled_date,
        it.status,
        it.notes,
        it.created_at,
        sw.name AS source_warehouse_name,
        dw.name AS dest_warehouse_name,
        (SELECT COUNT(*) FROM internal_transfer_items iti WHERE iti.internal_transfer_id = it.id) AS item_lines,
        (SELECT COALESCE(SUM(iti.quantity),0) FROM internal_transfer_items iti WHERE iti.internal_transfer_id = it.id) AS total_qty
      FROM internal_transfers it
      LEFT JOIN warehouses sw ON it.source_warehouse_code = sw.code
      LEFT JOIN warehouses dw ON it.dest_warehouse_code = dw.code
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const t = `%${search.trim()}%`;
      sql += ' AND (it.reference LIKE ? OR it.source_warehouse_code LIKE ? OR it.dest_warehouse_code LIKE ? OR it.notes LIKE ?)';
      params.push(t, t, t, t);
    }
    if (status && status !== 'All') {
      sql += ' AND it.status = ?';
      params.push(status);
    }
    if (sourceWarehouse && sourceWarehouse !== 'All') {
      sql += ' AND it.source_warehouse_code = ?';
      params.push(sourceWarehouse);
    }
    if (destWarehouse && destWarehouse !== 'All') {
      sql += ' AND it.dest_warehouse_code = ?';
      params.push(destWarehouse);
    }
    if (dateFrom) {
      sql += ' AND it.scheduled_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND it.scheduled_date <= ?';
      params.push(dateTo);
    }

    const allowedSort = ['id', 'reference', 'source_warehouse_code', 'dest_warehouse_code', 'scheduled_date', 'status'];
    const sortField   = allowedSort.includes(sortBy) ? `it.${sortBy}` : 'it.id';
    const sortOrder   = order === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortField} ${sortOrder}`;

    const internalTransfers = db.prepare(sql).all(...params);
    return res.json({ count: internalTransfers.length, internalTransfers });
  } catch (err) {
    console.error('GET /internal-transfers error:', err);
    return res.status(500).json({ message: 'Failed to retrieve internal transfers' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/internal-transfers/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const row = db
      .prepare(`
        SELECT
          it.*,
          sw.name AS source_warehouse_name,
          dw.name AS dest_warehouse_name,
          (SELECT COUNT(*) FROM internal_transfer_items iti WHERE iti.internal_transfer_id = it.id) AS item_lines,
          (SELECT COALESCE(SUM(iti.quantity),0) FROM internal_transfer_items iti WHERE iti.internal_transfer_id = it.id) AS total_qty
        FROM internal_transfers it
        LEFT JOIN warehouses sw ON it.source_warehouse_code = sw.code
        LEFT JOIN warehouses dw ON it.dest_warehouse_code = dw.code
        WHERE it.id = ?
      `)
      .get(req.params.id);

    if (!row) return res.status(404).json({ message: 'Internal transfer not found' });
    return res.json({ internalTransfer: buildInternalTransfer(row) });
  } catch (err) {
    console.error('GET /internal-transfers/:id error:', err);
    return res.status(500).json({ message: 'Failed to retrieve internal transfer' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/internal-transfers  – create
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      sourceWarehouseCode,
      sourceWarehouse,
      destWarehouseCode,
      destWarehouse,
      scheduledDate,
      status,
      notes,
      items,
    } = req.body;

    const rawSrc = sourceWarehouseCode || sourceWarehouse || '';
    const rawDst = destWarehouseCode || destWarehouse || '';

    // ── Validation ──────────────────────────────────────────────────────────
    if (!rawSrc || !rawSrc.trim())
      return res.status(400).json({ message: 'Source warehouse facility is required' });
    if (!rawDst || !rawDst.trim())
      return res.status(400).json({ message: 'Destination warehouse facility is required' });

    const srcWH = rawSrc.trim();
    const dstWH = rawDst.trim();

    if (srcWH === dstWH) {
      return res.status(400).json({ message: 'Source and destination warehouses cannot be the same facility' });
    }

    if (!scheduledDate)
      return res.status(400).json({ message: 'Scheduled transfer date is required' });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'At least one product line item is required' });

    const wh1 = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(srcWH);
    if (!wh1) return res.status(400).json({ message: `Invalid source warehouse code: ${srcWH}` });

    const wh2 = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(dstWH);
    if (!wh2) return res.status(400).json({ message: `Invalid destination warehouse code: ${dstWH}` });

    const seenIds = new Set();
    for (const item of items) {
      if (!item.productId) return res.status(400).json({ message: 'Each item must have a product selected' });
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)
        return res.status(400).json({ message: 'Each item quantity must be a positive integer' });

      if (seenIds.has(item.productId)) {
        return res.status(400).json({ message: 'Duplicate product line item. Each product can only appear once per transfer' });
      }
      seenIds.add(item.productId);

      const prod = db.prepare('SELECT id, sku, name FROM products WHERE id = ?').get(item.productId);
      if (!prod) return res.status(400).json({ message: `Product ID ${item.productId} not found` });
    }

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    const cleanStatus = validStatuses.includes(status) ? status : 'Draft';

    // ── Check stock sufficiency if status is Done ───────────────────────────
    if (cleanStatus === 'Done') {
      for (const item of items) {
        const prod = db.prepare('SELECT id, sku, name FROM products WHERE id = ?').get(item.productId);
        const reqQty = Math.floor(Number(item.quantity));
        const availStock = getWarehouseStock(item.productId, srcWH);
        if (availStock < reqQty) {
          return res.status(400).json({
            message: `Insufficient stock at source warehouse ${srcWH} for product [${prod.sku}] "${prod.name}". Available: ${availStock}, Requested: ${reqQty}`,
          });
        }
      }
    }

    // ── Auto-generate reference ──────────────────────────────────────────────
    const year = new Date().getFullYear();
    const seq  = Math.floor(1000 + Math.random() * 9000);
    const reference = `IT-${year}-${seq}`;

    // ── Transactional insert ─────────────────────────────────────────────────
    const createIT = db.transaction(() => {
      const result = db
        .prepare(`
          INSERT INTO internal_transfers (reference, source_warehouse_code, dest_warehouse_code, scheduled_date, status, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(reference, srcWH, dstWH, scheduledDate, cleanStatus, notes || '');

      const itId = result.lastInsertRowid;

      for (const item of items) {
        db.prepare(`
          INSERT INTO internal_transfer_items (internal_transfer_id, product_id, quantity)
          VALUES (?, ?, ?)
        `).run(itId, Number(item.productId), Math.floor(Number(item.quantity)));
      }

      // If status is Done on creation, move stock between warehouses
      if (cleanStatus === 'Done') {
        for (const item of items) {
          const qty = Math.floor(Number(item.quantity));
          adjustWarehouseStock(Number(item.productId), srcWH, -qty);
          adjustWarehouseStock(Number(item.productId), dstWH, +qty);
        }
      }

      // Record activity in inventory_activities for Dashboard synchronization
      const totalUnits = items.reduce((s, i) => s + Math.floor(Number(i.quantity)), 0);
      db.prepare(`
        INSERT INTO inventory_activities
          (reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes)
        VALUES (?, 'Internal', 'Warehouse Transfer', ?, ?, 'Transfer', ?, ?, ?, ?)
      `).run(reference, srcWH, dstWH, totalUnits, scheduledDate, cleanStatus, notes || '');

      return itId;
    });

    const itId = createIT();

    const row = db
      .prepare(`
        SELECT it.*, sw.name AS source_warehouse_name, dw.name AS dest_warehouse_name,
          (SELECT COUNT(*) FROM internal_transfer_items iti WHERE iti.internal_transfer_id = it.id) AS item_lines,
          (SELECT COALESCE(SUM(iti.quantity),0) FROM internal_transfer_items iti WHERE iti.internal_transfer_id = it.id) AS total_qty
        FROM internal_transfers it
        LEFT JOIN warehouses sw ON it.source_warehouse_code = sw.code
        LEFT JOIN warehouses dw ON it.dest_warehouse_code = dw.code
        WHERE it.id = ?
      `)
      .get(itId);

    return res.status(201).json({ message: 'Internal transfer created successfully', internalTransfer: buildInternalTransfer(row) });
  } catch (err) {
    console.error('POST /internal-transfers error:', err);
    return res.status(500).json({ message: err.message || 'Failed to create internal transfer' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/internal-transfers/:id  – update (full update incl. status transition)
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM internal_transfers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Internal transfer not found' });

    // Protect against modifying or duplicate processing of already Done transfers
    if (existing.status === 'Done') {
      return res.status(400).json({
        message: 'A completed internal transfer is finalized and cannot be modified or re-processed',
      });
    }

    const {
      sourceWarehouseCode,
      sourceWarehouse,
      destWarehouseCode,
      destWarehouse,
      scheduledDate,
      status,
      notes,
      items,
    } = req.body;

    const rawSrcParam = sourceWarehouseCode !== undefined ? sourceWarehouseCode : sourceWarehouse;
    const rawDstParam = destWarehouseCode !== undefined ? destWarehouseCode : destWarehouse;

    const newSource = rawSrcParam !== undefined ? rawSrcParam.trim() : existing.source_warehouse_code;
    const newDest   = rawDstParam !== undefined ? rawDstParam.trim() : existing.dest_warehouse_code;

    // Validate different facilities
    if (newSource === newDest) {
      return res.status(400).json({ message: 'Source and destination warehouses cannot be the same facility' });
    }

    if (sourceWarehouseCode !== undefined) {
      const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(newSource);
      if (!wh) return res.status(400).json({ message: `Invalid source warehouse code: ${newSource}` });
    }
    if (destWarehouseCode !== undefined) {
      const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(newDest);
      if (!wh) return res.status(400).json({ message: `Invalid destination warehouse code: ${newDest}` });
    }

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    if (status !== undefined && !validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid status value' });

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0)
        return res.status(400).json({ message: 'At least one line item is required' });
      const seenIds = new Set();
      for (const item of items) {
        if (!item.productId) return res.status(400).json({ message: 'Each item must have a product selected' });
        if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)
          return res.status(400).json({ message: 'Item quantity must be a positive integer' });
        if (seenIds.has(item.productId)) {
          return res.status(400).json({ message: 'Duplicate product line item. Each product can only appear once per transfer' });
        }
        seenIds.add(item.productId);
        const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(item.productId);
        if (!prod) return res.status(400).json({ message: `Product ID ${item.productId} not found` });
      }
    }

    const newStatus      = status        !== undefined ? status        : existing.status;
    const newDate        = scheduledDate !== undefined ? scheduledDate : existing.scheduled_date;
    const newNotes       = notes         !== undefined ? notes         : existing.notes;
    const becomingDone   = newStatus === 'Done' && existing.status !== 'Done';

    // Determine line items to check/transfer
    let lineItemsToCheck = [];
    if (items !== undefined) {
      lineItemsToCheck = items.map((it) => ({
        product_id: Number(it.productId),
        quantity: Math.floor(Number(it.quantity)),
      }));
    } else {
      lineItemsToCheck = db
        .prepare('SELECT product_id, quantity FROM internal_transfer_items WHERE internal_transfer_id = ?')
        .all(id);
    }

    // ── Pre-execution stock sufficiency check if becoming Done ──────────────
    if (becomingDone) {
      for (const li of lineItemsToCheck) {
        const prod = db.prepare('SELECT id, sku, name FROM products WHERE id = ?').get(li.product_id);
        if (!prod) {
          return res.status(400).json({ message: `Product ID ${li.product_id} no longer exists in inventory.` });
        }
        const availStock = getWarehouseStock(li.product_id, newSource);
        if (availStock < li.quantity) {
          return res.status(400).json({
            message: `Insufficient stock at source warehouse ${newSource} for product [${prod.sku}] "${prod.name}". Available: ${availStock}, Required: ${li.quantity}`,
          });
        }
      }
    }

    // ── Execute atomic update ───────────────────────────────────────────────
    const doUpdate = db.transaction(() => {
      db.prepare(`
        UPDATE internal_transfers
        SET source_warehouse_code=?, dest_warehouse_code=?, scheduled_date=?, status=?, notes=?
        WHERE id=?
      `).run(newSource, newDest, newDate, newStatus, newNotes, id);

      // Replace line items if provided
      if (items !== undefined) {
        db.prepare('DELETE FROM internal_transfer_items WHERE internal_transfer_id = ?').run(id);
        for (const item of items) {
          db.prepare('INSERT INTO internal_transfer_items (internal_transfer_id, product_id, quantity) VALUES (?,?,?)')
            .run(Number(id), Number(item.productId), Math.floor(Number(item.quantity)));
        }
      }

      // Move stock if becoming Done
      if (becomingDone) {
        for (const li of lineItemsToCheck) {
          adjustWarehouseStock(li.product_id, newSource, -li.quantity);
          adjustWarehouseStock(li.product_id, newDest, +li.quantity);
        }
      }

      // Sync the legacy inventory_activities row
      const totalUnits = lineItemsToCheck.reduce((s, i) => s + i.quantity, 0);
      db.prepare(`
        UPDATE inventory_activities
        SET status=?, source_location=?, dest_location=?, scheduled_date=?, notes=?, items_count=?
        WHERE reference = ?
      `).run(newStatus, newSource, newDest, newDate, newNotes, totalUnits, existing.reference);
    });

    doUpdate();

    const row = db
      .prepare(`
        SELECT it.*, sw.name AS source_warehouse_name, dw.name AS dest_warehouse_name,
          (SELECT COUNT(*) FROM internal_transfer_items iti WHERE iti.internal_transfer_id = it.id) AS item_lines,
          (SELECT COALESCE(SUM(iti.quantity),0) FROM internal_transfer_items iti WHERE iti.internal_transfer_id = it.id) AS total_qty
        FROM internal_transfers it
        LEFT JOIN warehouses sw ON it.source_warehouse_code = sw.code
        LEFT JOIN warehouses dw ON it.dest_warehouse_code = dw.code
        WHERE it.id = ?
      `)
      .get(id);

    return res.json({
      message: becomingDone
        ? 'Internal transfer marked as Done — inventory relocated between warehouses'
        : 'Internal transfer updated successfully',
      internalTransfer: buildInternalTransfer(row),
    });
  } catch (err) {
    console.error('PATCH /internal-transfers/:id error:', err);
    return res.status(500).json({ message: err.message || 'Failed to update internal transfer' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/internal-transfers/:id  – cancel / delete
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM internal_transfers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Internal transfer not found' });

    if (existing.status === 'Done') {
      return res.status(400).json({
        message: 'Completed internal transfers cannot be deleted — inventory stock has already been transferred',
      });
    }
    if (existing.status === 'Ready') {
      return res.status(400).json({
        message: 'Ready internal transfers must be canceled first before deletion',
      });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM internal_transfer_items WHERE internal_transfer_id = ?').run(id);
      db.prepare('DELETE FROM internal_transfers WHERE id = ?').run(id);
      db.prepare('DELETE FROM inventory_activities WHERE reference = ?').run(existing.reference);
    })();

    return res.json({ message: `Internal transfer ${existing.reference} deleted`, id: Number(id) });
  } catch (err) {
    console.error('DELETE /internal-transfers/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete internal transfer' });
  }
});

module.exports = router;
