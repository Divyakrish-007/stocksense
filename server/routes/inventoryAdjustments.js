const express = require('express');
const router = express.Router();
const { db, getWarehouseStock, setWarehouseStock, adjustWarehouseStock } = require('../db');
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

// ─── Helper: build full inventory adjustment object from database row ─────────
function buildInventoryAdjustment(row) {
  const items = db
    .prepare(`
      SELECT
        iai.id,
        iai.product_id,
        iai.quantity,
        iai.previous_quantity,
        iai.adjusted_quantity,
        p.sku,
        p.name   AS product_name,
        p.category,
        p.unit_price,
        p.quantity AS total_product_stock
      FROM inventory_adjustment_items iai
      JOIN products p ON iai.product_id = p.id
      WHERE iai.adjustment_id = ?
      ORDER BY iai.id ASC
    `)
    .all(row.id);

  // Enrich each line item with the live warehouse-specific stock balance
  const enrichedItems = items.map((it) => {
    const currentWhStock = getWarehouseStock(it.product_id, row.warehouse_code);
    return {
      ...it,
      current_warehouse_stock: currentWhStock,
    };
  });

  return { ...row, items: enrichedItems };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/inventory-adjustments/meta
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
        FROM inventory_adjustments
      `)
      .get();

    const reasons = [
      'Annual Physical Inventory Audit',
      'Routine ABC Cycle Count',
      'Damaged Packaging Write-off',
      'Supplier Shortage Reconciliation',
      'Barcode Calibration Drift Correction',
      'Sample Testing Deduction',
      'Spill / Quarantine Scrap',
      'Unrecorded Inbound Intake',
      'System Discrepancy Correction',
    ];

    const types = ['Increase', 'Decrease', 'Set'];

    return res.json({ warehouses, stats, reasons, types });
  } catch (err) {
    console.error('inventory-adjustments/meta error:', err);
    return res.status(500).json({ message: 'Failed to retrieve inventory adjustments metadata' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/inventory-adjustments  – list with search / filter / sort
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, status, warehouse, warehouseCode, adjustmentType, type, dateFrom, dateTo, sortBy, order } = req.query;

    let sql = `
      SELECT
        ia.id,
        ia.reference,
        ia.warehouse_code,
        ia.reason,
        ia.adjustment_type,
        ia.status,
        ia.notes,
        ia.created_at,
        ia.updated_at,
        w.name AS warehouse_name,
        w.location AS warehouse_location,
        (SELECT COUNT(*) FROM inventory_adjustment_items iai WHERE iai.adjustment_id = ia.id) AS item_lines,
        (SELECT COALESCE(SUM(iai.quantity),0) FROM inventory_adjustment_items iai WHERE iai.adjustment_id = ia.id) AS total_qty
      FROM inventory_adjustments ia
      LEFT JOIN warehouses w ON ia.warehouse_code = w.code
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const t = `%${search.trim()}%`;
      sql += ' AND (ia.reference LIKE ? OR ia.reason LIKE ? OR ia.warehouse_code LIKE ? OR ia.notes LIKE ?)';
      params.push(t, t, t, t);
    }

    if (status && status !== 'All') {
      sql += ' AND ia.status = ?';
      params.push(status);
    }

    const whFilter = warehouse || warehouseCode;
    if (whFilter && whFilter !== 'All') {
      sql += ' AND ia.warehouse_code = ?';
      params.push(whFilter);
    }

    const typeFilter = adjustmentType || type;
    if (typeFilter && typeFilter !== 'All') {
      sql += ' AND ia.adjustment_type = ?';
      params.push(typeFilter);
    }

    if (dateFrom) {
      sql += ' AND ia.created_at >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND ia.created_at <= ?';
      params.push(dateTo);
    }

    const allowedSort = ['id', 'reference', 'warehouse_code', 'reason', 'adjustment_type', 'created_at', 'status'];
    const sortField   = allowedSort.includes(sortBy) ? `ia.${sortBy}` : 'ia.id';
    const sortOrder   = order === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortField} ${sortOrder}`;

    const rawAdjustments = db.prepare(sql).all(...params);

    // Map rows and include item lines
    const inventoryAdjustments = rawAdjustments.map((row) => ({
      ...row,
      warehouseCode: row.warehouse_code,
      adjustmentType: row.adjustment_type,
    }));

    return res.json({ count: inventoryAdjustments.length, inventoryAdjustments });
  } catch (err) {
    console.error('GET /inventory-adjustments error:', err);
    return res.status(500).json({ message: 'Failed to retrieve inventory adjustments' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/inventory-adjustments/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const row = db
      .prepare(`
        SELECT
          ia.id,
          ia.reference,
          ia.warehouse_code,
          ia.reason,
          ia.adjustment_type,
          ia.status,
          ia.notes,
          ia.created_at,
          ia.updated_at,
          w.name AS warehouse_name,
          w.location AS warehouse_location,
          (SELECT COUNT(*) FROM inventory_adjustment_items iai WHERE iai.adjustment_id = ia.id) AS item_lines,
          (SELECT COALESCE(SUM(iai.quantity),0) FROM inventory_adjustment_items iai WHERE iai.adjustment_id = ia.id) AS total_qty
        FROM inventory_adjustments ia
        LEFT JOIN warehouses w ON ia.warehouse_code = w.code
        WHERE ia.id = ?
      `)
      .get(req.params.id);

    if (!row) return res.status(404).json({ message: 'Inventory adjustment not found' });
    return res.json({ inventoryAdjustment: buildInventoryAdjustment(row) });
  } catch (err) {
    console.error('GET /inventory-adjustments/:id error:', err);
    return res.status(500).json({ message: 'Failed to retrieve inventory adjustment' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/inventory-adjustments  – create adjustment
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      warehouseCode,
      warehouse,
      reason,
      adjustmentType,
      type,
      status,
      notes,
      items,
    } = req.body;

    const rawWh = (warehouseCode || warehouse || '').trim();
    const rawReason = (reason || '').trim();
    const rawType = (adjustmentType || type || '').trim();

    // ── Validation ──────────────────────────────────────────────────────────
    if (!rawWh)
      return res.status(400).json({ message: 'Warehouse location is required' });
    if (!rawReason)
      return res.status(400).json({ message: 'Adjustment reason is required' });

    const validTypes = ['Increase', 'Decrease', 'Set'];
    if (!validTypes.includes(rawType)) {
      return res.status(400).json({ message: `Invalid adjustment type. Must be one of: ${validTypes.join(', ')}` });
    }

    const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(rawWh);
    if (!wh) return res.status(400).json({ message: `Invalid warehouse code: ${rawWh}` });

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'Adjustment must contain at least one product line item' });

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    const cleanStatus = validStatuses.includes(status) ? status : 'Draft';

    const seenIds = new Set();
    for (const item of items) {
      if (!item.productId) return res.status(400).json({ message: 'Each item must have a product selected' });

      const qtyNum = Number(item.quantity);
      if (!Number.isInteger(qtyNum)) {
        return res.status(400).json({ message: 'Each item quantity must be an integer' });
      }

      if (rawType === 'Set' && qtyNum < 0) {
        return res.status(400).json({ message: 'Set target stock quantity cannot be negative' });
      }

      if ((rawType === 'Increase' || rawType === 'Decrease') && qtyNum <= 0) {
        return res.status(400).json({ message: `${rawType} adjustment quantity must be a positive integer greater than 0` });
      }

      if (seenIds.has(item.productId)) {
        return res.status(400).json({ message: 'Duplicate product line items are not allowed. Each product can only appear once per adjustment.' });
      }
      seenIds.add(item.productId);

      const prod = db.prepare('SELECT id, sku, name FROM products WHERE id = ?').get(item.productId);
      if (!prod) return res.status(400).json({ message: `Product ID ${item.productId} not found` });
    }

    // ── Validate negative stock protection if status is Done ────────────────
    if (cleanStatus === 'Done') {
      for (const item of items) {
        const prod = db.prepare('SELECT id, sku, name FROM products WHERE id = ?').get(item.productId);
        const prevStock = getWarehouseStock(item.productId, rawWh);
        const qtyNum = Math.floor(Number(item.quantity));

        if (rawType === 'Decrease' && prevStock < qtyNum) {
          return res.status(400).json({
            message: `Insufficient stock at warehouse ${rawWh} for product [${prod.sku}] "${prod.name}". Available: ${prevStock}, Attempted reduction: ${qtyNum}`,
          });
        }
      }
    }

    // ── Auto-generate reference ──────────────────────────────────────────────
    const year = new Date().getFullYear();
    const seq  = Math.floor(1000 + Math.random() * 9000);
    const reference = `ADJ-${year}-${seq}`;

    // ── Transactional insert ─────────────────────────────────────────────────
    const createAdj = db.transaction(() => {
      const result = db
        .prepare(`
          INSERT INTO inventory_adjustments (reference, warehouse_code, reason, adjustment_type, status, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .run(reference, rawWh, rawReason, rawType, cleanStatus, notes || '');

      const adjId = result.lastInsertRowid;

      for (const item of items) {
        const prodId = Number(item.productId);
        const qtyNum = Math.floor(Number(item.quantity));
        const prevStock = getWarehouseStock(prodId, rawWh);

        let adjStock = prevStock;
        let delta = 0;

        if (rawType === 'Increase') {
          adjStock = prevStock + qtyNum;
          delta = qtyNum;
        } else if (rawType === 'Decrease') {
          adjStock = prevStock - qtyNum;
          delta = -qtyNum;
        } else if (rawType === 'Set') {
          adjStock = qtyNum;
          delta = qtyNum - prevStock;
        }

        db.prepare(`
          INSERT INTO inventory_adjustment_items (adjustment_id, product_id, quantity, previous_quantity, adjusted_quantity)
          VALUES (?, ?, ?, ?, ?)
        `).run(adjId, prodId, qtyNum, prevStock, cleanStatus === 'Done' ? adjStock : prevStock);

        // If status is Done on creation, apply stock changes immediately
        if (cleanStatus === 'Done') {
          setWarehouseStock(prodId, rawWh, adjStock);
          const prod = db.prepare('SELECT id, sku, name, quantity, warehouse_code FROM products WHERE id = ?').get(prodId);
          if (prod && rawType === 'Set' && prod.warehouse_code === rawWh) {
            db.prepare('UPDATE products SET quantity = ? WHERE id = ?').run(qtyNum, prodId);
          } else {
            db.prepare('UPDATE products SET quantity = MAX(0, quantity + ?) WHERE id = ?').run(delta, prodId);
          }
          syncProductStatus(prodId);
        }
      }

      // Record in inventory_activities for Dashboard synchronization
      const totalUnits = items.reduce((s, i) => s + Math.floor(Number(i.quantity)), 0);
      const todayDate = new Date().toISOString().split('T')[0];

      db.prepare(`
        INSERT INTO inventory_activities
          (reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes)
        VALUES (?, 'Adjustments', ?, ?, 'Physical Count Rec', 'Inventory Adjustment', ?, ?, ?, ?)
      `).run(reference, rawReason, rawWh, totalUnits, todayDate, cleanStatus, notes || '');

      return adjId;
    });

    const adjId = createAdj();

    const row = db
      .prepare(`
        SELECT
          ia.id,
          ia.reference,
          ia.warehouse_code,
          ia.reason,
          ia.adjustment_type,
          ia.status,
          ia.notes,
          ia.created_at,
          ia.updated_at,
          w.name AS warehouse_name,
          w.location AS warehouse_location,
          (SELECT COUNT(*) FROM inventory_adjustment_items iai WHERE iai.adjustment_id = ia.id) AS item_lines,
          (SELECT COALESCE(SUM(iai.quantity),0) FROM inventory_adjustment_items iai WHERE iai.adjustment_id = ia.id) AS total_qty
        FROM inventory_adjustments ia
        LEFT JOIN warehouses w ON ia.warehouse_code = w.code
        WHERE ia.id = ?
      `)
      .get(adjId);

    return res.status(201).json({
      message: 'Inventory adjustment created successfully',
      inventoryAdjustment: buildInventoryAdjustment(row),
    });
  } catch (err) {
    console.error('POST /inventory-adjustments error:', err);
    return res.status(500).json({ message: err.message || 'Failed to create inventory adjustment' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/inventory-adjustments/:id  – update / execute adjustment
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM inventory_adjustments WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Inventory adjustment not found' });

    // Protect against modifying or duplicate processing of already Done adjustments
    if (existing.status === 'Done') {
      return res.status(400).json({
        message: 'A completed inventory adjustment is finalized and cannot be modified or re-processed',
      });
    }

    const {
      warehouseCode,
      warehouse,
      reason,
      adjustmentType,
      type,
      status,
      notes,
      items,
    } = req.body;

    const rawWh = warehouseCode !== undefined ? warehouseCode : warehouse;
    const effectiveWarehouse = rawWh !== undefined ? rawWh.trim() : existing.warehouse_code;

    const rawType = adjustmentType !== undefined ? adjustmentType : type;
    const effectiveType = rawType !== undefined ? rawType.trim() : existing.adjustment_type;

    const effectiveReason = reason !== undefined ? reason.trim() : existing.reason;
    const effectiveNotes  = notes !== undefined ? notes : existing.notes;
    const targetStatus    = status !== undefined ? status : existing.status;

    if (rawWh !== undefined) {
      const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(effectiveWarehouse);
      if (!wh) return res.status(400).json({ message: `Invalid warehouse code: ${effectiveWarehouse}` });
    }

    const validTypes = ['Increase', 'Decrease', 'Set'];
    if (rawType !== undefined && !validTypes.includes(effectiveType)) {
      return res.status(400).json({ message: `Invalid adjustment type. Must be one of: ${validTypes.join(', ')}` });
    }

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    if (status !== undefined && !validStatuses.includes(targetStatus)) {
      return res.status(400).json({ message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Determine line items to use (either passed in payload or existing in DB)
    let workingItems = items;
    if (workingItems !== undefined) {
      if (!Array.isArray(workingItems) || workingItems.length === 0) {
        return res.status(400).json({ message: 'Adjustment must contain at least one product line item' });
      }

      const seenIds = new Set();
      for (const item of workingItems) {
        if (!item.productId) return res.status(400).json({ message: 'Each item must have a product selected' });

        const qtyNum = Number(item.quantity);
        if (!Number.isInteger(qtyNum)) {
          return res.status(400).json({ message: 'Each item quantity must be an integer' });
        }

        if (effectiveType === 'Set' && qtyNum < 0) {
          return res.status(400).json({ message: 'Set target stock quantity cannot be negative' });
        }

        if ((effectiveType === 'Increase' || effectiveType === 'Decrease') && qtyNum <= 0) {
          return res.status(400).json({ message: `${effectiveType} adjustment quantity must be a positive integer greater than 0` });
        }

        if (seenIds.has(item.productId)) {
          return res.status(400).json({ message: 'Duplicate product line item. Each product can only appear once per adjustment.' });
        }
        seenIds.add(item.productId);

        const prod = db.prepare('SELECT id, sku, name FROM products WHERE id = ?').get(item.productId);
        if (!prod) return res.status(400).json({ message: `Product ID ${item.productId} not found` });
      }
    } else {
      const existingItems = db
        .prepare('SELECT product_id AS productId, quantity FROM inventory_adjustment_items WHERE adjustment_id = ?')
        .all(id);
      workingItems = existingItems;
    }

    // ── Check stock sufficiency if status is transitioning to Done ───────────
    if (targetStatus === 'Done') {
      for (const item of workingItems) {
        const prod = db.prepare('SELECT id, sku, name FROM products WHERE id = ?').get(item.productId);
        const prevStock = getWarehouseStock(item.productId, effectiveWarehouse);
        const qtyNum = Math.floor(Number(item.quantity));

        if (effectiveType === 'Decrease' && prevStock < qtyNum) {
          return res.status(400).json({
            message: `Insufficient stock at warehouse ${effectiveWarehouse} for product [${prod.sku}] "${prod.name}". Available: ${prevStock}, Attempted reduction: ${qtyNum}`,
          });
        }
      }
    }

    // ── Execute update in atomic transaction ─────────────────────────────────
    const executeUpdate = db.transaction(() => {
      db.prepare(`
        UPDATE inventory_adjustments
        SET warehouse_code = ?, reason = ?, adjustment_type = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(effectiveWarehouse, effectiveReason, effectiveType, targetStatus, effectiveNotes, id);

      if (items !== undefined) {
        db.prepare('DELETE FROM inventory_adjustment_items WHERE adjustment_id = ?').run(id);

        for (const item of items) {
          const prodId = Number(item.productId);
          const qtyNum = Math.floor(Number(item.quantity));
          const prevStock = getWarehouseStock(prodId, effectiveWarehouse);

          db.prepare(`
            INSERT INTO inventory_adjustment_items (adjustment_id, product_id, quantity, previous_quantity, adjusted_quantity)
            VALUES (?, ?, ?, ?, ?)
          `).run(id, prodId, qtyNum, prevStock, prevStock);
        }
      }

      // If transitioning to Done, execute atomic stock movements
      if (targetStatus === 'Done') {
        for (const item of workingItems) {
          const prodId = Number(item.productId);
          const qtyNum = Math.floor(Number(item.quantity));
          const prevStock = getWarehouseStock(prodId, effectiveWarehouse);

          let adjStock = prevStock;
          let delta = 0;

          if (effectiveType === 'Increase') {
            adjStock = prevStock + qtyNum;
            delta = qtyNum;
          } else if (effectiveType === 'Decrease') {
            adjStock = prevStock - qtyNum;
            delta = -qtyNum;
          } else if (effectiveType === 'Set') {
            adjStock = qtyNum;
            delta = qtyNum - prevStock;
          }

          db.prepare(`
            UPDATE inventory_adjustment_items
            SET previous_quantity = ?, adjusted_quantity = ?
            WHERE adjustment_id = ? AND product_id = ?
          `).run(prevStock, adjStock, id, prodId);

          setWarehouseStock(prodId, effectiveWarehouse, adjStock);
          const prod = db.prepare('SELECT id, sku, name, quantity, warehouse_code FROM products WHERE id = ?').get(prodId);
          if (prod && effectiveType === 'Set' && prod.warehouse_code === effectiveWarehouse) {
            db.prepare('UPDATE products SET quantity = ? WHERE id = ?').run(qtyNum, prodId);
          } else {
            db.prepare('UPDATE products SET quantity = MAX(0, quantity + ?) WHERE id = ?').run(delta, prodId);
          }
          syncProductStatus(prodId);
        }

        // Update / Insert dashboard activity
        const totalUnits = workingItems.reduce((s, i) => s + Math.floor(Number(i.quantity)), 0);
        const todayDate = new Date().toISOString().split('T')[0];

        const existingAct = db.prepare('SELECT id FROM inventory_activities WHERE reference = ?').get(existing.reference);
        if (existingAct) {
          db.prepare(`
            UPDATE inventory_activities
            SET status = 'Done', contact = ?, source_location = ?, items_count = ?, notes = ?
            WHERE id = ?
          `).run(effectiveReason, effectiveWarehouse, totalUnits, effectiveNotes, existingAct.id);
        } else {
          db.prepare(`
            INSERT INTO inventory_activities
              (reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes)
            VALUES (?, 'Adjustments', ?, ?, 'Physical Count Rec', 'Inventory Adjustment', ?, ?, 'Done', ?)
          `).run(existing.reference, effectiveReason, effectiveWarehouse, totalUnits, todayDate, effectiveNotes);
        }
      }
    });

    executeUpdate();

    const row = db
      .prepare(`
        SELECT
          ia.id,
          ia.reference,
          ia.warehouse_code,
          ia.reason,
          ia.adjustment_type,
          ia.status,
          ia.notes,
          ia.created_at,
          ia.updated_at,
          w.name AS warehouse_name,
          w.location AS warehouse_location,
          (SELECT COUNT(*) FROM inventory_adjustment_items iai WHERE iai.adjustment_id = ia.id) AS item_lines,
          (SELECT COALESCE(SUM(iai.quantity),0) FROM inventory_adjustment_items iai WHERE iai.adjustment_id = ia.id) AS total_qty
        FROM inventory_adjustments ia
        LEFT JOIN warehouses w ON ia.warehouse_code = w.code
        WHERE ia.id = ?
      `)
      .get(id);

    const message =
      targetStatus === 'Done'
        ? 'Inventory adjustment marked as Done — stock reconciled in SQLite'
        : 'Inventory adjustment updated successfully';

    return res.json({ message, inventoryAdjustment: buildInventoryAdjustment(row) });
  } catch (err) {
    console.error('PATCH /inventory-adjustments/:id error:', err);
    return res.status(500).json({ message: err.message || 'Failed to update inventory adjustment' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/inventory-adjustments/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM inventory_adjustments WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Inventory adjustment not found' });

    if (existing.status === 'Done') {
      return res.status(400).json({
        message: 'Completed inventory adjustments cannot be deleted — audit records must be preserved',
      });
    }

    if (existing.status === 'Ready') {
      return res.status(400).json({
        message: 'Ready adjustments must be canceled first before deletion',
      });
    }

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM inventory_adjustment_items WHERE adjustment_id = ?').run(id);
      db.prepare('DELETE FROM inventory_adjustments WHERE id = ?').run(id);
      db.prepare('DELETE FROM inventory_activities WHERE reference = ?').run(existing.reference);
    });

    deleteTx();

    return res.json({ message: 'Inventory adjustment deleted successfully', id: Number(id) });
  } catch (err) {
    console.error('DELETE /inventory-adjustments/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete inventory adjustment' });
  }
});

module.exports = router;
