const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// ─── Helper: recompute & persist product status ────────────────────────────────
function syncProductStatus(productId) {
  const prod = db.prepare('SELECT quantity, min_stock_level FROM products WHERE id = ?').get(productId);
  if (!prod) return;
  const qty = prod.quantity;
  const minStock = prod.min_stock_level;
  const status = qty === 0 ? 'Out of Stock' : qty <= minStock ? 'Low Stock' : 'In Stock';
  db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, productId);
}

// ─── Helper: build a full receipt object from a row ───────────────────────────
function buildReceipt(row) {
  const items = db
    .prepare(`
      SELECT
        ri.id,
        ri.product_id,
        ri.quantity,
        p.sku,
        p.name   AS product_name,
        p.category
      FROM receipt_items ri
      JOIN products p ON ri.product_id = p.id
      WHERE ri.receipt_id = ?
      ORDER BY ri.id ASC
    `)
    .all(row.id);

  return { ...row, items };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/receipts/meta
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
        FROM receipts
      `)
      .get();

    return res.json({ warehouses, stats });
  } catch (err) {
    console.error('receipts/meta error:', err);
    return res.status(500).json({ message: 'Failed to retrieve receipts metadata' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/receipts  – list with search / filter / sort
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, status, warehouse, dateFrom, dateTo, sortBy, order } = req.query;

    let sql = `
      SELECT
        r.id,
        r.reference,
        r.vendor,
        r.warehouse_code,
        r.scheduled_date,
        r.status,
        r.notes,
        r.created_at,
        w.name   AS warehouse_name,
        w.location AS warehouse_location,
        (SELECT COUNT(*) FROM receipt_items ri WHERE ri.receipt_id = r.id) AS item_lines,
        (SELECT COALESCE(SUM(ri.quantity),0) FROM receipt_items ri WHERE ri.receipt_id = r.id) AS total_qty
      FROM receipts r
      LEFT JOIN warehouses w ON r.warehouse_code = w.code
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const t = `%${search.trim()}%`;
      sql += ' AND (r.reference LIKE ? OR r.vendor LIKE ? OR r.notes LIKE ?)';
      params.push(t, t, t);
    }
    if (status && status !== 'All') {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (warehouse && warehouse !== 'All') {
      sql += ' AND r.warehouse_code = ?';
      params.push(warehouse);
    }
    if (dateFrom) {
      sql += ' AND r.scheduled_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND r.scheduled_date <= ?';
      params.push(dateTo);
    }

    const validSorts = {
      reference:      'r.reference',
      vendor:         'r.vendor',
      scheduled_date: 'r.scheduled_date',
      status:         'r.status',
      id:             'r.id',
    };
    const col = validSorts[sortBy] || 'r.id';
    const dir = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${col} ${dir}`;

    const rows = db.prepare(sql).all(...params);
    // Attach items to each row
    const receipts = rows.map(buildReceipt);

    return res.json({ count: receipts.length, receipts });
  } catch (err) {
    console.error('GET /receipts error:', err);
    return res.status(500).json({ message: 'Failed to retrieve receipts' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/receipts/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const row = db
      .prepare(`
        SELECT
          r.id, r.reference, r.vendor, r.warehouse_code,
          r.scheduled_date, r.status, r.notes, r.created_at,
          w.name AS warehouse_name, w.location AS warehouse_location
        FROM receipts r
        LEFT JOIN warehouses w ON r.warehouse_code = w.code
        WHERE r.id = ?
      `)
      .get(req.params.id);

    if (!row) return res.status(404).json({ message: 'Receipt not found' });
    return res.json({ receipt: buildReceipt(row) });
  } catch (err) {
    console.error('GET /receipts/:id error:', err);
    return res.status(500).json({ message: 'Failed to retrieve receipt' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/receipts  – create
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticateToken, (req, res) => {
  try {
    const { vendor, warehouseCode, scheduledDate, status, notes, items } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!vendor || !vendor.trim())
      return res.status(400).json({ message: 'Vendor / partner name is required' });
    if (!warehouseCode || !warehouseCode.trim())
      return res.status(400).json({ message: 'Destination warehouse is required' });
    if (!scheduledDate)
      return res.status(400).json({ message: 'Scheduled date is required' });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'At least one product line item is required' });

    const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(warehouseCode.trim());
    if (!wh) return res.status(400).json({ message: `Invalid warehouse code: ${warehouseCode}` });

    for (const item of items) {
      if (!item.productId) return res.status(400).json({ message: 'Each item must have a product' });
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)
        return res.status(400).json({ message: 'Each item quantity must be a positive integer' });
      const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(item.productId);
      if (!prod) return res.status(400).json({ message: `Product ID ${item.productId} not found` });
    }

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    const cleanStatus = validStatuses.includes(status) ? status : 'Draft';

    // ── Auto-generate reference ──────────────────────────────────────────────
    const year = new Date().getFullYear();
    const seq  = Math.floor(1000 + Math.random() * 9000);
    const reference = `REC-${year}-${seq}`;

    // ── Transactional insert ─────────────────────────────────────────────────
    const createReceipt = db.transaction(() => {
      const result = db
        .prepare(`
          INSERT INTO receipts (reference, vendor, warehouse_code, scheduled_date, status, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(reference, vendor.trim(), warehouseCode.trim(), scheduledDate, cleanStatus, notes || '');

      const receiptId = result.lastInsertRowid;

      for (const item of items) {
        db.prepare(`
          INSERT INTO receipt_items (receipt_id, product_id, quantity)
          VALUES (?, ?, ?)
        `).run(receiptId, Number(item.productId), Math.floor(Number(item.quantity)));
      }

      // If status is already Done on creation, update stock immediately
      if (cleanStatus === 'Done') {
        for (const item of items) {
          db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?')
            .run(Math.floor(Number(item.quantity)), Number(item.productId));
          syncProductStatus(Number(item.productId));
        }
        // Also update the legacy inventory_activities table for dashboard compatibility
        db.prepare(`
          INSERT INTO inventory_activities
            (reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes)
          VALUES (?, 'Receipts', ?, 'Vendor / Inbound', ?, 'General', ?, ?, ?, ?)
        `).run(reference, vendor.trim(), warehouseCode.trim(),
               items.reduce((s, i) => s + Math.floor(Number(i.quantity)), 0),
               scheduledDate, cleanStatus, notes || '');
      } else {
        // Still create the activity row (for Dashboard pending count)
        db.prepare(`
          INSERT INTO inventory_activities
            (reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes)
          VALUES (?, 'Receipts', ?, 'Vendor / Inbound', ?, 'General', ?, ?, ?, ?)
        `).run(reference, vendor.trim(), warehouseCode.trim(),
               items.reduce((s, i) => s + Math.floor(Number(i.quantity)), 0),
               scheduledDate, cleanStatus, notes || '');
      }

      return receiptId;
    });

    const receiptId = createReceipt();

    const row = db
      .prepare(`
        SELECT r.*, w.name AS warehouse_name, w.location AS warehouse_location
        FROM receipts r LEFT JOIN warehouses w ON r.warehouse_code = w.code
        WHERE r.id = ?
      `)
      .get(receiptId);

    return res.status(201).json({ message: 'Receipt created successfully', receipt: buildReceipt(row) });
  } catch (err) {
    console.error('POST /receipts error:', err);
    return res.status(500).json({ message: 'Failed to create receipt' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/receipts/:id  – update (full update incl. status)
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Receipt not found' });

    const { vendor, warehouseCode, scheduledDate, status, notes, items } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (vendor !== undefined && !vendor.trim())
      return res.status(400).json({ message: 'Vendor name cannot be empty' });
    if (warehouseCode !== undefined) {
      const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(warehouseCode.trim());
      if (!wh) return res.status(400).json({ message: `Invalid warehouse code: ${warehouseCode}` });
    }

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    if (status !== undefined && !validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid status value' });

    // Prevent re-processing a Done receipt
    if (existing.status === 'Done' && status && status !== 'Done')
      return res.status(400).json({ message: 'A completed receipt cannot be re-opened' });

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0)
        return res.status(400).json({ message: 'At least one line item is required' });
      for (const item of items) {
        if (!item.productId) return res.status(400).json({ message: 'Each item must have a product' });
        if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)
          return res.status(400).json({ message: 'Item quantity must be a positive integer' });
      }
    }

    const newStatus    = status      !== undefined ? status             : existing.status;
    const newVendor    = vendor      !== undefined ? vendor.trim()      : existing.vendor;
    const newWH        = warehouseCode !== undefined ? warehouseCode.trim() : existing.warehouse_code;
    const newDate      = scheduledDate !== undefined ? scheduledDate    : existing.scheduled_date;
    const newNotes     = notes       !== undefined ? notes              : existing.notes;
    const wasAlreadyDone = existing.status === 'Done';
    const becomingDone   = newStatus === 'Done' && !wasAlreadyDone;

    const doUpdate = db.transaction(() => {
      db.prepare(`
        UPDATE receipts SET vendor=?, warehouse_code=?, scheduled_date=?, status=?, notes=? WHERE id=?
      `).run(newVendor, newWH, newDate, newStatus, newNotes, id);

      // Replace line items if provided
      if (items !== undefined) {
        db.prepare('DELETE FROM receipt_items WHERE receipt_id = ?').run(id);
        for (const item of items) {
          db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?,?,?)')
            .run(Number(id), Number(item.productId), Math.floor(Number(item.quantity)));
        }
      }

      // Stock update when transitioning to Done
      if (becomingDone) {
        const lineItems = db
          .prepare('SELECT product_id, quantity FROM receipt_items WHERE receipt_id = ?')
          .all(id);
        for (const li of lineItems) {
          db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?')
            .run(li.quantity, li.product_id);
          syncProductStatus(li.product_id);
        }
      }

      // Sync the legacy inventory_activities row
      db.prepare(`
        UPDATE inventory_activities SET status=?, contact=?, dest_location=?, scheduled_date=?, notes=?
        WHERE reference = ?
      `).run(newStatus, newVendor, newWH, newDate, newNotes, existing.reference);
    });

    doUpdate();

    const row = db
      .prepare(`
        SELECT r.*, w.name AS warehouse_name, w.location AS warehouse_location
        FROM receipts r LEFT JOIN warehouses w ON r.warehouse_code = w.code
        WHERE r.id = ?
      `)
      .get(id);

    return res.json({
      message: becomingDone
        ? 'Receipt marked as Done — stock levels updated'
        : 'Receipt updated successfully',
      receipt: buildReceipt(row),
    });
  } catch (err) {
    console.error('PATCH /receipts/:id error:', err);
    return res.status(500).json({ message: 'Failed to update receipt' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/receipts/:id  – cancel / delete (only Draft, Waiting, Canceled)
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Receipt not found' });

    if (existing.status === 'Done') {
      return res.status(400).json({
        message: 'Completed receipts cannot be deleted — they have already updated stock levels',
      });
    }
    if (existing.status === 'Ready') {
      return res.status(400).json({
        message: 'Ready receipts must be canceled first before deletion',
      });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM receipt_items WHERE receipt_id = ?').run(id);
      db.prepare('DELETE FROM receipts WHERE id = ?').run(id);
      db.prepare("DELETE FROM inventory_activities WHERE reference = ?").run(existing.reference);
    })();

    return res.json({ message: `Receipt ${existing.reference} deleted`, id: Number(id) });
  } catch (err) {
    console.error('DELETE /receipts/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete receipt' });
  }
});

module.exports = router;
