const express = require('express');
const router = express.Router();
const { db, getWarehouseStock, setWarehouseStock } = require('../db');
const { authenticateToken } = require('./auth');

// ─── Helper: sync product stock status ───────────────────────────────────────
function syncProductStatus(productId) {
  const prod = db.prepare('SELECT quantity, min_stock_level FROM products WHERE id = ?').get(productId);
  if (!prod) return;
  const qty = prod.quantity;
  const status = qty === 0 ? 'Out of Stock' : qty <= prod.min_stock_level ? 'Low Stock' : 'In Stock';
  db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, productId);
}

// ─── Helper: build line items for a PO ───────────────────────────────────────
function buildPOItems(poId) {
  return db.prepare(`
    SELECT
      poi.id, poi.purchase_order_id, poi.product_id,
      poi.quantity, poi.unit_price, poi.tax_rate, poi.discount, poi.line_total,
      poi.quantity_received,
      p.sku, p.name AS product_name, p.category, p.quantity AS current_stock
    FROM purchase_order_items poi
    JOIN products p ON poi.product_id = p.id
    WHERE poi.purchase_order_id = ?
    ORDER BY poi.id ASC
  `).all(poId);
}

// ─── Helper: build full PO object ────────────────────────────────────────────
function buildPO(row) {
  const items = buildPOItems(row.id);
  return { ...row, items };
}

// ─── Helper: validate and compute line items ──────────────────────────────────
function validateAndComputeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Purchase order must contain at least one product line item' };
  }
  const seenIds = new Set();
  let subtotal = 0, taxTotal = 0, discountTotal = 0;
  const computed = [];

  for (const item of items) {
    if (!item.productId) return { error: 'Each line item must have a product selected' };
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isInteger(qty) || qty <= 0) return { error: 'Each item quantity must be a positive integer greater than 0' };
    const price = Number(item.unitPrice ?? item.unit_price ?? 0);
    if (isNaN(price) || price < 0) return { error: 'Unit price must be greater than or equal to 0' };
    const taxRate = Number(item.taxRate ?? item.tax_rate ?? 0);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) return { error: 'Tax rate must be between 0 and 100%' };
    const discount = Number(item.discount ?? 0);
    if (isNaN(discount) || discount < 0 || discount > 100) return { error: 'Discount must be between 0 and 100%' };

    if (seenIds.has(item.productId)) return { error: 'Duplicate product line items are not allowed. Each product can only appear once per purchase order.' };
    seenIds.add(item.productId);

    const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(item.productId);
    if (!prod) return { error: `Product ID ${item.productId} not found in catalog` };

    const lineBase  = qty * price;
    const lineDisc  = lineBase * (discount / 100);
    const lineTax   = (lineBase - lineDisc) * (taxRate / 100);
    const lineTotal = lineBase - lineDisc + lineTax;

    subtotal      += lineBase;
    discountTotal += lineDisc;
    taxTotal      += lineTax;

    computed.push({ productId: Number(item.productId), qty, price, taxRate, discount, lineTotal });
  }

  const grandTotal = subtotal - discountTotal + taxTotal;
  return { computed, subtotal, taxTotal, discountTotal, grandTotal };
}

// ─── Helper: atomic inventory stock intake when PO is marked 'Done' ─────────
function processDonePO(poId, warehouseCode) {
  const items = db.prepare('SELECT product_id, quantity FROM purchase_order_items WHERE purchase_order_id = ?').all(poId);
  const supplier = db.prepare(`
    SELECT s.name FROM suppliers s
    JOIN purchase_orders po ON po.supplier_id = s.id
    WHERE po.id = ?
  `).get(poId);
  const poRef = db.prepare('SELECT reference, notes FROM purchase_orders WHERE id = ?').get(poId);

  for (const item of items) {
    // Increment warehouse stock for specific facility
    const currentWhStock = getWarehouseStock(item.product_id, warehouseCode);
    setWarehouseStock(item.product_id, warehouseCode, currentWhStock + item.quantity);

    // Increment overall product total quantity
    db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?').run(item.quantity, item.product_id);
    
    // Mark quantity_received on line item equal to quantity
    db.prepare('UPDATE purchase_order_items SET quantity_received = quantity WHERE purchase_order_id = ? AND product_id = ?').run(poId, item.product_id);

    // Sync product stock status
    syncProductStatus(item.product_id);
  }

  // Update PO status
  db.prepare(`UPDATE purchase_orders SET status = 'Done', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(poId);

  // Sync / log in dashboard activities
  const act = db.prepare('SELECT id FROM inventory_activities WHERE reference = ?').get(poRef?.reference);
  if (act) {
    db.prepare(`UPDATE inventory_activities SET status = 'Done' WHERE id = ?`).run(act.id);
  } else if (poRef) {
    const todayDate = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO inventory_activities
        (reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes)
      VALUES (?, 'Receipts', ?, 'Supplier / Procurement', ?, 'Purchase Order Intake', ?, ?, 'Done', ?)
    `).run(poRef.reference, supplier ? supplier.name : 'Supplier', warehouseCode, items.length, todayDate, poRef.notes || '');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/purchase-orders/meta
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/meta', authenticateToken, (req, res) => {
  try {
    const warehouses = db.prepare('SELECT code, name, location FROM warehouses ORDER BY code ASC').all();
    const suppliers  = db.prepare('SELECT id, code, name, payment_terms FROM suppliers WHERE status = ? ORDER BY name ASC').all('Active');
    const products   = db.prepare(`
      SELECT id, sku, name, category, unit_price, quantity, warehouse_code, status
      FROM products ORDER BY name ASC
    `).all();

    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) AS draft,
        COUNT(CASE WHEN status = 'Waiting' THEN 1 END) AS waiting,
        COUNT(CASE WHEN status = 'Ready' THEN 1 END) AS ready,
        COUNT(CASE WHEN status IN ('Done', 'Received') THEN 1 END) AS done,
        COUNT(CASE WHEN status = 'Canceled' THEN 1 END) AS canceled,
        COALESCE(SUM(CASE WHEN status NOT IN ('Canceled') THEN grand_total END), 0) AS total_value
      FROM purchase_orders
    `).get();

    return res.json({ warehouses, suppliers, products, stats });
  } catch (err) {
    console.error('purchase-orders/meta error:', err);
    return res.status(500).json({ message: 'Failed to retrieve purchase orders metadata' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/purchase-orders
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, status, warehouse, supplier, dateFrom, dateTo, sortBy = 'id', order = 'DESC' } = req.query;

    let sql = `
      SELECT
        po.id, po.reference, po.supplier_id,
        po.warehouse_code, po.order_date, po.expected_date,
        po.payment_terms, po.notes,
        po.subtotal, po.tax_total, po.discount_total, po.grand_total,
        po.status, po.created_at, po.updated_at,
        s.name AS supplier_name, s.code AS supplier_code,
        w.name AS warehouse_name,
        (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS item_lines,
        (SELECT COALESCE(SUM(poi.quantity), 0) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS total_qty,
        (SELECT COALESCE(SUM(poi.quantity_received), 0) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS total_received
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN warehouses w ON po.warehouse_code = w.code
      WHERE 1=1
    `;
    const params = [];

    if (search?.trim()) {
      sql += ` AND (po.reference LIKE ? OR s.name LIKE ? OR s.code LIKE ? OR po.notes LIKE ?)`;
      const q = `%${search.trim()}%`;
      params.push(q, q, q, q);
    }
    if (status && status !== 'All') {
      sql += ` AND po.status = ?`;
      params.push(status);
    }
    if (warehouse && warehouse !== 'All') {
      sql += ` AND po.warehouse_code = ?`;
      params.push(warehouse);
    }
    if (supplier && supplier !== 'All') {
      sql += ` AND po.supplier_id = ?`;
      params.push(supplier);
    }
    if (dateFrom) {
      sql += ` AND po.order_date >= ?`;
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ` AND po.order_date <= ?`;
      params.push(dateTo);
    }

    const allowedSort = {
      id: 'po.id',
      reference: 'po.reference',
      supplier_name: 's.name',
      order_date: 'po.order_date',
      expected_date: 'po.expected_date',
      grand_total: 'po.grand_total',
      status: 'po.status',
    };
    const sf = allowedSort[sortBy] || 'po.id';
    sql += ` ORDER BY ${sf} ${order === 'ASC' ? 'ASC' : 'DESC'}`;

    const purchaseOrders = db.prepare(sql).all(...params);
    return res.json({ count: purchaseOrders.length, purchaseOrders });
  } catch (err) {
    console.error('GET /purchase-orders error:', err);
    return res.status(500).json({ message: 'Failed to retrieve purchase orders' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/purchase-orders/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const row = db.prepare(`
      SELECT
        po.id, po.reference, po.supplier_id,
        po.warehouse_code, po.order_date, po.expected_date,
        po.payment_terms, po.notes,
        po.subtotal, po.tax_total, po.discount_total, po.grand_total,
        po.status, po.created_at, po.updated_at,
        s.name AS supplier_name, s.code AS supplier_code,
        s.contact_person AS supplier_contact, s.email AS supplier_email,
        w.name AS warehouse_name, w.location AS warehouse_location,
        (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS item_lines,
        (SELECT COALESCE(SUM(poi.quantity), 0) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS total_qty,
        (SELECT COALESCE(SUM(poi.quantity_received), 0) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS total_received
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN warehouses w ON po.warehouse_code = w.code
      WHERE po.id = ?
    `).get(req.params.id);

    if (!row) return res.status(404).json({ message: 'Purchase order not found' });
    return res.json({ purchaseOrder: buildPO(row) });
  } catch (err) {
    console.error('GET /purchase-orders/:id error:', err);
    return res.status(500).json({ message: 'Failed to retrieve purchase order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/purchase-orders
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticateToken, (req, res) => {
  try {
    const { supplierId, warehouseCode, orderDate, expectedDate, paymentTerms, notes, status, items } = req.body;

    if (!supplierId) return res.status(400).json({ message: 'Supplier is required' });
    const supplier = db.prepare('SELECT id, name FROM suppliers WHERE id = ?').get(supplierId);
    if (!supplier) return res.status(400).json({ message: `Supplier ID ${supplierId} not found` });

    if (!warehouseCode?.trim()) return res.status(400).json({ message: 'Destination warehouse is required' });
    const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(warehouseCode.trim());
    if (!wh) return res.status(400).json({ message: `Invalid warehouse code: ${warehouseCode}` });

    if (!orderDate) return res.status(400).json({ message: 'Order date is required' });
    if (!expectedDate) return res.status(400).json({ message: 'Expected delivery date is required' });

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    const cleanStatus = validStatuses.includes(status) ? status : 'Draft';

    const itemsResult = validateAndComputeItems(items);
    if (itemsResult.error) return res.status(400).json({ message: itemsResult.error });
    const { computed, subtotal, taxTotal, discountTotal, grandTotal } = itemsResult;

    const year = new Date().getFullYear();
    const seq  = Math.floor(1000 + Math.random() * 9000);
    const reference = `PO-${year}-${seq}`;

    const createPOTx = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO purchase_orders
          (reference, supplier_id, warehouse_code, order_date, expected_date, payment_terms, notes, subtotal, tax_total, discount_total, grand_total, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reference, supplierId, warehouseCode.trim(), orderDate, expectedDate,
        (paymentTerms || 'Net 30').trim(), notes || '',
        subtotal.toFixed(2), taxTotal.toFixed(2), discountTotal.toFixed(2), grandTotal.toFixed(2),
        cleanStatus === 'Done' ? 'Draft' : cleanStatus // insert as Draft first if executing Done
      );

      const poId = result.lastInsertRowid;

      for (const it of computed) {
        db.prepare(`
          INSERT INTO purchase_order_items
            (purchase_order_id, product_id, quantity, unit_price, tax_rate, discount, line_total, quantity_received)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `).run(poId, it.productId, it.qty, it.price, it.taxRate, it.discount, it.lineTotal.toFixed(2));
      }

      // Log activity in dashboard
      db.prepare(`
        INSERT INTO inventory_activities
          (reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes)
        VALUES (?, 'Receipts', ?, 'Supplier / Procurement', ?, 'Purchase Order', ?, ?, ?, ?)
      `).run(reference, supplier.name, warehouseCode.trim(), computed.length, expectedDate, cleanStatus, notes || '');

      // If created directly with status = 'Done', process stock intake atomically
      if (cleanStatus === 'Done') {
        processDonePO(poId, warehouseCode.trim());
      }

      return poId;
    });

    const poId = createPOTx();

    const row = db.prepare(`
      SELECT po.*, s.name AS supplier_name, s.code AS supplier_code,
        s.contact_person AS supplier_contact, s.email AS supplier_email,
        w.name AS warehouse_name, w.location AS warehouse_location,
        (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS item_lines,
        (SELECT COALESCE(SUM(poi.quantity), 0) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS total_qty,
        (SELECT COALESCE(SUM(poi.quantity_received), 0) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS total_received
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN warehouses w ON po.warehouse_code = w.code
      WHERE po.id = ?
    `).get(poId);

    return res.status(201).json({ message: 'Purchase order created successfully', purchaseOrder: buildPO(row) });
  } catch (err) {
    console.error('POST /purchase-orders error:', err);
    return res.status(500).json({ message: err.message || 'Failed to create purchase order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/purchase-orders/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Purchase order not found' });

    // Safeguard against modifying finalized Done/Received orders
    if (['Done', 'Received'].includes(existing.status)) {
      return res.status(400).json({
        message: 'A completed purchase order is finalized and cannot be modified or re-processed',
      });
    }
    if (existing.status === 'Canceled') {
      return res.status(400).json({ message: 'Canceled purchase orders cannot be modified' });
    }

    const { supplierId, warehouseCode, orderDate, expectedDate, paymentTerms, notes, status, items } = req.body;

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    const targetStatus = status !== undefined && validStatuses.includes(status) ? status : existing.status;

    let subtotalVal = existing.subtotal;
    let taxTotalVal = existing.tax_total;
    let discTotalVal = existing.discount_total;
    let grandTotalVal = existing.grand_total;
    let computedItems = null;

    if (items !== undefined) {
      const result = validateAndComputeItems(items);
      if (result.error) return res.status(400).json({ message: result.error });
      subtotalVal   = result.subtotal.toFixed(2);
      taxTotalVal   = result.taxTotal.toFixed(2);
      discTotalVal  = result.discountTotal.toFixed(2);
      grandTotalVal = result.grandTotal.toFixed(2);
      computedItems = result.computed;
    }

    const updatePOTx = db.transaction(() => {
      const activeWh = warehouseCode?.trim() ?? existing.warehouse_code;

      db.prepare(`
        UPDATE purchase_orders SET
          supplier_id = ?, warehouse_code = ?, order_date = ?, expected_date = ?,
          payment_terms = ?, notes = ?,
          subtotal = ?, tax_total = ?, discount_total = ?, grand_total = ?,
          status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        supplierId ?? existing.supplier_id,
        activeWh,
        orderDate ?? existing.order_date,
        expectedDate ?? existing.expected_date,
        paymentTerms?.trim() ?? existing.payment_terms,
        notes ?? existing.notes,
        subtotalVal, taxTotalVal, discTotalVal, grandTotalVal,
        targetStatus, id
      );

      if (computedItems !== null) {
        db.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(id);
        for (const it of computedItems) {
          db.prepare(`
            INSERT INTO purchase_order_items
              (purchase_order_id, product_id, quantity, unit_price, tax_rate, discount, line_total, quantity_received)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
          `).run(id, it.productId, it.qty, it.price, it.taxRate, it.discount, it.lineTotal.toFixed(2));
        }
      }

      // Update dashboard activity status
      const act = db.prepare('SELECT id FROM inventory_activities WHERE reference = ?').get(existing.reference);
      if (act) {
        db.prepare(`UPDATE inventory_activities SET status = ? WHERE id = ?`).run(targetStatus, act.id);
      }

      // If transitioning status to 'Done', execute atomic inventory stock intake
      if (targetStatus === 'Done') {
        processDonePO(id, activeWh);
      }
    });

    updatePOTx();

    const row = db.prepare(`
      SELECT po.*, s.name AS supplier_name, s.code AS supplier_code,
        s.contact_person AS supplier_contact, s.email AS supplier_email,
        w.name AS warehouse_name, w.location AS warehouse_location,
        (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS item_lines,
        (SELECT COALESCE(SUM(poi.quantity), 0) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS total_qty,
        (SELECT COALESCE(SUM(poi.quantity_received), 0) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS total_received
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN warehouses w ON po.warehouse_code = w.code
      WHERE po.id = ?
    `).get(id);

    return res.json({ message: `Purchase order updated successfully${targetStatus === 'Done' ? ' and inventory stock updated' : ''}`, purchaseOrder: buildPO(row) });
  } catch (err) {
    console.error('PATCH /purchase-orders/:id error:', err);
    return res.status(500).json({ message: err.message || 'Failed to update purchase order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/purchase-orders/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Purchase order not found' });

    if (['Done', 'Received'].includes(existing.status)) {
      return res.status(400).json({
        message: 'Completed purchase orders cannot be deleted — inventory stock has already been updated',
      });
    }

    const hasReceipts = db.prepare('SELECT COUNT(*) AS c FROM purchase_order_receipts WHERE purchase_order_id = ?').get(id);
    if (hasReceipts && hasReceipts.c > 0) {
      return res.status(400).json({
        message: 'Cannot delete purchase order: goods receipts are linked to this order',
      });
    }

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(id);
      db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id);
      db.prepare('DELETE FROM inventory_activities WHERE reference = ?').run(existing.reference);
    });
    deleteTx();

    return res.json({ message: 'Purchase order deleted successfully', id: Number(id) });
  } catch (err) {
    console.error('DELETE /purchase-orders/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete purchase order' });
  }
});

module.exports = router;
