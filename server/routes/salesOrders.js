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

// ─── Helper: build line items for a Sales Order ──────────────────────────────
function buildSalesOrderItems(soId, warehouseCode) {
  const items = db.prepare(`
    SELECT
      soi.id, soi.sales_order_id, soi.product_id,
      soi.quantity, soi.unit_price, soi.tax_rate, soi.discount, soi.line_total,
      soi.quantity_shipped,
      p.sku, p.name AS product_name, p.category, p.quantity AS current_stock
    FROM sales_order_items soi
    JOIN products p ON soi.product_id = p.id
    WHERE soi.sales_order_id = ?
    ORDER BY soi.id ASC
  `).all(soId);

  return items.map((it) => {
    const whStock = getWarehouseStock(it.product_id, warehouseCode);
    const available_stock = whStock > 0 ? whStock : it.current_stock;
    return { ...it, available_stock };
  });
}

// ─── Helper: build full Sales Order object ────────────────────────────────────
function buildSalesOrder(row) {
  const items = buildSalesOrderItems(row.id, row.warehouse_code);
  return { ...row, items };
}

// ─── Helper: validate and compute line items ──────────────────────────────────
function validateAndComputeItems(items, warehouseCode) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Sales order must contain at least one product line item' };
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

    if (seenIds.has(item.productId)) return { error: 'Duplicate product line items are not allowed. Each product can only appear once per sales order.' };
    seenIds.add(item.productId);

    const prod = db.prepare('SELECT id, sku, name, quantity, warehouse_code FROM products WHERE id = ?').get(item.productId);
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

// ─── Helper: atomic outbound stock deduction when SO is marked 'Done' ────────
function processDoneSalesOrder(soId, warehouseCode) {
  const items = db.prepare('SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?').all(soId);
  const soRef = db.prepare('SELECT reference, customer, notes, order_date FROM sales_orders WHERE id = ?').get(soId);

  // Step 1: Verify sufficient stock for all items
  for (const item of items) {
    const prod = db.prepare('SELECT id, sku, name, quantity, warehouse_code FROM products WHERE id = ?').get(item.product_id);
    if (!prod) {
      throw new Error(`Product ID ${item.product_id} no longer exists in inventory.`);
    }
    const whStock = getWarehouseStock(item.product_id, warehouseCode);
    const availStock = whStock > 0 ? whStock : (prod.warehouse_code === warehouseCode ? prod.quantity : prod.quantity);
    if (availStock < item.quantity) {
      throw new Error(`Insufficient stock for product [${prod.sku}] "${prod.name}". Available: ${availStock}, Requested: ${item.quantity}`);
    }
  }

  // Step 2: Deduct stock and increment quantity_shipped
  for (const item of items) {
    const whStock = getWarehouseStock(item.product_id, warehouseCode);
    const newWhStock = Math.max(0, whStock - item.quantity);
    setWarehouseStock(item.product_id, warehouseCode, newWhStock);

    // Deduct overall product total quantity
    db.prepare('UPDATE products SET quantity = MAX(0, quantity - ?) WHERE id = ?').run(item.quantity, item.product_id);

    // Update quantity_shipped on line item equal to quantity
    db.prepare('UPDATE sales_order_items SET quantity_shipped = quantity WHERE sales_order_id = ? AND product_id = ?').run(soId, item.product_id);

    // Synchronize product stock status
    syncProductStatus(item.product_id);
  }

  // Step 3: Update SO status
  db.prepare(`UPDATE sales_orders SET status = 'Done', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(soId);

  // Step 4: Synchronize inventory_activities with type: 'Sales'
  const act = db.prepare('SELECT id FROM inventory_activities WHERE reference = ?').get(soRef?.reference);
  if (act) {
    db.prepare(`UPDATE inventory_activities SET status = 'Done', type = 'Sales' WHERE id = ?`).run(act.id);
  } else if (soRef) {
    const orderDate = soRef.order_date || new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO inventory_activities
        (reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes)
      VALUES (?, 'Sales', ?, ?, 'Customer Outbound', 'Sales Orders', ?, ?, 'Done', ?)
    `).run(soRef.reference, soRef.customer, warehouseCode, items.length, orderDate, soRef.notes || '');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/sales-orders/meta
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/meta', authenticateToken, (req, res) => {
  try {
    const warehouses = db.prepare('SELECT code, name, location FROM warehouses ORDER BY code ASC').all();
    const products   = db.prepare(`
      SELECT id, sku, name, category, unit_price, quantity, warehouse_code, status
      FROM products ORDER BY name ASC
    `).all();

    const rawCustomers = db.prepare(`
      SELECT DISTINCT customer FROM sales_orders WHERE customer IS NOT NULL AND customer != ''
      UNION
      SELECT DISTINCT customer FROM delivery_orders WHERE customer IS NOT NULL AND customer != ''
      ORDER BY customer ASC
    `).all().map(r => r.customer);

    const statsRow = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) AS draft,
        COUNT(CASE WHEN status = 'Waiting' THEN 1 END) AS waiting,
        COUNT(CASE WHEN status = 'Ready' THEN 1 END) AS ready,
        COUNT(CASE WHEN status = 'Done' THEN 1 END) AS done,
        COUNT(CASE WHEN status = 'Canceled' THEN 1 END) AS canceled,
        COALESCE(SUM(CASE WHEN status NOT IN ('Canceled') THEN grand_total END), 0) AS total_value
      FROM sales_orders
    `).get();

    const totalValuation = statsRow.total_value;

    return res.json({
      total: statsRow.total,
      draft: statsRow.draft,
      waiting: statsRow.waiting,
      ready: statsRow.ready,
      done: statsRow.done,
      canceled: statsRow.canceled,
      totalValuation,
      stats: {
        total: statsRow.total,
        draft: statsRow.draft,
        waiting: statsRow.waiting,
        ready: statsRow.ready,
        done: statsRow.done,
        canceled: statsRow.canceled,
        totalValuation,
        total_value: totalValuation,
      },
      warehouses,
      products,
      customers: rawCustomers,
      customerNames: rawCustomers,
    });
  } catch (err) {
    console.error('sales-orders/meta error:', err);
    return res.status(500).json({ message: 'Failed to retrieve sales orders metadata' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/sales-orders  – list with search / filter / sort
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, status, warehouse, dateFrom, dateTo, sortBy = 'id', order = 'DESC' } = req.query;

    let sql = `
      SELECT
        so.id, so.reference, so.customer, so.warehouse_code,
        so.order_date, so.expected_date, so.shipping_address,
        so.payment_terms, so.notes,
        so.subtotal, so.tax_total, so.discount_total, so.grand_total,
        so.status, so.created_at, so.updated_at,
        w.name AS warehouse_name, w.location AS warehouse_location,
        (SELECT COUNT(*) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS item_lines,
        (SELECT COALESCE(SUM(soi.quantity), 0) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS total_qty,
        (SELECT COALESCE(SUM(soi.quantity_shipped), 0) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS total_shipped
      FROM sales_orders so
      LEFT JOIN warehouses w ON so.warehouse_code = w.code
      WHERE 1=1
    `;
    const params = [];

    if (search?.trim()) {
      sql += ` AND (so.reference LIKE ? OR so.customer LIKE ? OR so.shipping_address LIKE ? OR so.notes LIKE ?)`;
      const q = `%${search.trim()}%`;
      params.push(q, q, q, q);
    }
    if (status && status !== 'All') {
      sql += ` AND so.status = ?`;
      params.push(status);
    }
    if (warehouse && warehouse !== 'All') {
      sql += ` AND so.warehouse_code = ?`;
      params.push(warehouse);
    }
    if (dateFrom) {
      sql += ` AND so.order_date >= ?`;
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ` AND so.order_date <= ?`;
      params.push(dateTo);
    }

    const allowedSort = {
      id: 'so.id',
      reference: 'so.reference',
      customer: 'so.customer',
      order_date: 'so.order_date',
      expected_date: 'so.expected_date',
      grand_total: 'so.grand_total',
      status: 'so.status',
    };
    const sf = allowedSort[sortBy] || 'so.id';
    sql += ` ORDER BY ${sf} ${order === 'ASC' ? 'ASC' : 'DESC'}`;

    const salesOrders = db.prepare(sql).all(...params);
    return res.json({ count: salesOrders.length, salesOrders });
  } catch (err) {
    console.error('GET /sales-orders error:', err);
    return res.status(500).json({ message: 'Failed to retrieve sales orders' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/sales-orders/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const row = db.prepare(`
      SELECT
        so.id, so.reference, so.customer, so.warehouse_code,
        so.order_date, so.expected_date, so.shipping_address,
        so.payment_terms, so.notes,
        so.subtotal, so.tax_total, so.discount_total, so.grand_total,
        so.status, so.created_at, so.updated_at,
        w.name AS warehouse_name, w.location AS warehouse_location,
        (SELECT COUNT(*) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS item_lines,
        (SELECT COALESCE(SUM(soi.quantity), 0) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS total_qty,
        (SELECT COALESCE(SUM(soi.quantity_shipped), 0) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS total_shipped
      FROM sales_orders so
      LEFT JOIN warehouses w ON so.warehouse_code = w.code
      WHERE so.id = ?
    `).get(req.params.id);

    if (!row) return res.status(404).json({ message: 'Sales order not found' });
    return res.json({ salesOrder: buildSalesOrder(row) });
  } catch (err) {
    console.error('GET /sales-orders/:id error:', err);
    return res.status(500).json({ message: 'Failed to retrieve sales order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/sales-orders
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticateToken, (req, res) => {
  try {
    const { customer, warehouseCode, orderDate, expectedDate, shippingAddress, paymentTerms, notes, status, items } = req.body;

    if (!customer || !customer.trim())
      return res.status(400).json({ message: 'Customer name is required' });

    if (!warehouseCode || !warehouseCode.trim())
      return res.status(400).json({ message: 'Source warehouse is required' });
    const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(warehouseCode.trim());
    if (!wh) return res.status(400).json({ message: `Invalid warehouse code: ${warehouseCode}` });

    if (!orderDate) return res.status(400).json({ message: 'Order date is required' });

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    const cleanStatus = validStatuses.includes(status) ? status : 'Draft';

    const itemsResult = validateAndComputeItems(items, warehouseCode.trim());
    if (itemsResult.error) return res.status(400).json({ message: itemsResult.error });
    const { computed, subtotal, taxTotal, discountTotal, grandTotal } = itemsResult;

    // Check stock if creating as Done
    if (cleanStatus === 'Done') {
      for (const it of computed) {
        const prod = db.prepare('SELECT id, sku, name, quantity, warehouse_code FROM products WHERE id = ?').get(it.productId);
        const whStock = getWarehouseStock(it.productId, warehouseCode.trim());
        const availStock = whStock > 0 ? whStock : (prod.warehouse_code === warehouseCode.trim() ? prod.quantity : prod.quantity);
        if (availStock < it.qty) {
          return res.status(400).json({
            message: `Insufficient stock for product [${prod.sku}] "${prod.name}". Available: ${availStock}, Requested: ${it.qty}`,
          });
        }
      }
    }

    const year = new Date().getFullYear();
    const seq  = Math.floor(1000 + Math.random() * 9000);
    const reference = `SO-${year}-${seq}`;

    const createSOTx = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO sales_orders
          (reference, customer, warehouse_code, order_date, expected_date, shipping_address, payment_terms, notes, subtotal, tax_total, discount_total, grand_total, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reference, customer.trim(), warehouseCode.trim(), orderDate, expectedDate || null,
        (shippingAddress || '').trim(), (paymentTerms || 'Net 30').trim(), notes || '',
        subtotal.toFixed(2), taxTotal.toFixed(2), discountTotal.toFixed(2), grandTotal.toFixed(2),
        cleanStatus === 'Done' ? 'Draft' : cleanStatus
      );

      const soId = result.lastInsertRowid;

      for (const it of computed) {
        db.prepare(`
          INSERT INTO sales_order_items
            (sales_order_id, product_id, quantity, unit_price, tax_rate, discount, line_total, quantity_shipped)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `).run(soId, it.productId, it.qty, it.price, it.taxRate, it.discount, it.lineTotal.toFixed(2));
      }

      // Log activity in dashboard
      db.prepare(`
        INSERT INTO inventory_activities
          (reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes)
        VALUES (?, 'Sales', ?, ?, 'Customer Outbound', 'Sales Orders', ?, ?, ?, ?)
      `).run(reference, customer.trim(), warehouseCode.trim(), computed.length, orderDate, cleanStatus, notes || '');

      // If created as Done, process stock deduction atomically
      if (cleanStatus === 'Done') {
        processDoneSalesOrder(soId, warehouseCode.trim());
      }

      return soId;
    });

    const soId = createSOTx();

    const row = db.prepare(`
      SELECT so.*, w.name AS warehouse_name, w.location AS warehouse_location,
        (SELECT COUNT(*) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS item_lines,
        (SELECT COALESCE(SUM(soi.quantity), 0) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS total_qty,
        (SELECT COALESCE(SUM(soi.quantity_shipped), 0) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS total_shipped
      FROM sales_orders so
      LEFT JOIN warehouses w ON so.warehouse_code = w.code
      WHERE so.id = ?
    `).get(soId);

    return res.status(201).json({ message: 'Sales order created successfully', salesOrder: buildSalesOrder(row) });
  } catch (err) {
    console.error('POST /sales-orders error:', err);
    return res.status(500).json({ message: err.message || 'Failed to create sales order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/sales-orders/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Sales order not found' });

    // Safeguard against modifying finalized Done orders
    if (existing.status === 'Done') {
      return res.status(400).json({
        message: 'A completed sales order is finalized and cannot be modified or re-processed',
      });
    }

    const { customer, warehouseCode, orderDate, expectedDate, shippingAddress, paymentTerms, notes, status, items } = req.body;

    const validStatuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    const targetStatus = status !== undefined && validStatuses.includes(status) ? status : existing.status;
    const activeWh = warehouseCode?.trim() ?? existing.warehouse_code;

    let subtotalVal = existing.subtotal;
    let taxTotalVal = existing.tax_total;
    let discTotalVal = existing.discount_total;
    let grandTotalVal = existing.grand_total;
    let computedItems = null;

    if (items !== undefined) {
      const result = validateAndComputeItems(items, activeWh);
      if (result.error) return res.status(400).json({ message: result.error });
      subtotalVal   = result.subtotal.toFixed(2);
      taxTotalVal   = result.taxTotal.toFixed(2);
      discTotalVal  = result.discountTotal.toFixed(2);
      grandTotalVal = result.grandTotal.toFixed(2);
      computedItems = result.computed;
    }

    const becomingDone = targetStatus === 'Done' && existing.status !== 'Done';

    // If becoming Done, verify stock before running transaction or inside transaction
    if (becomingDone) {
      const checkItems = computedItems || db.prepare('SELECT product_id AS productId, quantity AS qty FROM sales_order_items WHERE sales_order_id = ?').all(id);
      for (const it of checkItems) {
        const prod = db.prepare('SELECT id, sku, name, quantity, warehouse_code FROM products WHERE id = ?').get(it.productId);
        if (!prod) return res.status(400).json({ message: `Product ID ${it.productId} not found` });
        const whStock = getWarehouseStock(it.productId, activeWh);
        const availStock = whStock > 0 ? whStock : (prod.warehouse_code === activeWh ? prod.quantity : prod.quantity);
        if (availStock < it.qty) {
          return res.status(400).json({
            message: `Insufficient stock for product [${prod.sku}] "${prod.name}". Available: ${availStock}, Requested: ${it.qty}`,
          });
        }
      }
    }

    // Execute atomic update
    const updateSOTx = db.transaction(() => {
      db.prepare(`
        UPDATE sales_orders SET
          customer = ?, warehouse_code = ?, order_date = ?, expected_date = ?,
          shipping_address = ?, payment_terms = ?, notes = ?,
          subtotal = ?, tax_total = ?, discount_total = ?, grand_total = ?,
          status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        customer?.trim() ?? existing.customer,
        activeWh,
        orderDate ?? existing.order_date,
        expectedDate ?? existing.expected_date,
        shippingAddress?.trim() ?? existing.shipping_address,
        paymentTerms?.trim() ?? existing.payment_terms,
        notes ?? existing.notes,
        subtotalVal, taxTotalVal, discTotalVal, grandTotalVal,
        becomingDone ? 'Draft' : targetStatus, id
      );

      if (computedItems !== null) {
        db.prepare('DELETE FROM sales_order_items WHERE sales_order_id = ?').run(id);
        for (const it of computedItems) {
          db.prepare(`
            INSERT INTO sales_order_items
              (sales_order_id, product_id, quantity, unit_price, tax_rate, discount, line_total, quantity_shipped)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
          `).run(id, it.productId, it.qty, it.price, it.taxRate, it.discount, it.lineTotal.toFixed(2));
        }
      }

      // Update dashboard activity status
      const act = db.prepare('SELECT id FROM inventory_activities WHERE reference = ?').get(existing.reference);
      if (act) {
        db.prepare(`UPDATE inventory_activities SET status = ?, type = 'Sales' WHERE id = ?`).run(targetStatus, act.id);
      }

      // If transitioning status to 'Done', execute atomic outbound stock deduction
      if (becomingDone) {
        processDoneSalesOrder(id, activeWh);
      }
    });

    updateSOTx();

    const row = db.prepare(`
      SELECT so.*, w.name AS warehouse_name, w.location AS warehouse_location,
        (SELECT COUNT(*) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS item_lines,
        (SELECT COALESCE(SUM(soi.quantity), 0) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS total_qty,
        (SELECT COALESCE(SUM(soi.quantity_shipped), 0) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) AS total_shipped
      FROM sales_orders so
      LEFT JOIN warehouses w ON so.warehouse_code = w.code
      WHERE so.id = ?
    `).get(id);

    return res.json({
      message: becomingDone
        ? 'Sales order marked as Done — inventory stock deducted'
        : 'Sales order updated successfully',
      salesOrder: buildSalesOrder(row),
    });
  } catch (err) {
    console.error('PATCH /sales-orders/:id error:', err);
    return res.status(500).json({ message: err.message || 'Failed to update sales order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/sales-orders/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Sales order not found' });

    if (existing.status === 'Done') {
      return res.status(400).json({
        message: 'Completed sales orders cannot be deleted — inventory stock has already been dispatched',
      });
    }

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM sales_order_items WHERE sales_order_id = ?').run(id);
      db.prepare('DELETE FROM sales_orders WHERE id = ?').run(id);
      db.prepare('DELETE FROM inventory_activities WHERE reference = ?').run(existing.reference);
    });
    deleteTx();

    return res.json({ message: `Sales order ${existing.reference} deleted successfully`, id: Number(id) });
  } catch (err) {
    console.error('DELETE /sales-orders/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete sales order' });
  }
});

module.exports = router;
