const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// ─── Helper: build full supplier object ───────────────────────────────────────
function buildSupplier(row) {
  const poStats = db.prepare(`
    SELECT
      COUNT(*) AS total_orders,
      COALESCE(SUM(grand_total), 0) AS total_value
    FROM purchase_orders
    WHERE supplier_id = ?
  `).get(row.id);

  return {
    ...row,
    total_orders: poStats ? poStats.total_orders : 0,
    total_value:  poStats ? Number(poStats.total_value) : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/suppliers/meta
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/meta', authenticateToken, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) AS active,
        COUNT(CASE WHEN status = 'Inactive' THEN 1 END) AS inactive
      FROM suppliers
    `).get();

    const totalOrders = db.prepare(`SELECT COUNT(*) AS c FROM purchase_orders`).get().c;

    const cities = db.prepare(`
      SELECT DISTINCT city FROM suppliers WHERE city != '' ORDER BY city ASC
    `).all().map(r => r.city);

    const paymentTerms = ['Net 30', 'Net 45', 'Net 60', 'Net 15', 'Immediate', 'COD'];

    return res.json({
      stats: {
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
        totalOrders,
      },
      cities,
      paymentTerms,
    });
  } catch (err) {
    console.error('suppliers/meta error:', err);
    return res.status(500).json({ message: 'Failed to retrieve suppliers metadata' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/suppliers
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, status, city, sortBy = 'id', order = 'ASC' } = req.query;

    let sql = `
      SELECT
        s.id, s.code, s.name, s.contact_person, s.email, s.phone,
        s.address, s.city, s.tax_id, s.payment_terms, s.notes, s.status,
        s.created_at, s.updated_at,
        COUNT(DISTINCT po.id) AS total_orders,
        COALESCE(SUM(po.grand_total), 0) AS total_value
      FROM suppliers s
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (search?.trim()) {
      sql += ` AND (s.code LIKE ? OR s.name LIKE ? OR s.contact_person LIKE ? OR s.email LIKE ? OR s.phone LIKE ?)`;
      const q = `%${search.trim()}%`;
      params.push(q, q, q, q, q);
    }
    if (status && status !== 'All') {
      sql += ` AND s.status = ?`;
      params.push(status);
    }
    if (city && city !== 'All') {
      sql += ` AND s.city = ?`;
      params.push(city);
    }

    sql += ` GROUP BY s.id`;

    const allowedSort = {
      id:           's.id',
      code:         's.code',
      name:         's.name',
      total_orders: 'total_orders',
      total_value:  'total_value',
    };
    const sf = allowedSort[sortBy] || 's.id';
    const so = order === 'DESC' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${sf} ${so}`;

    const suppliers = db.prepare(sql).all(...params);
    return res.json({ count: suppliers.length, suppliers });
  } catch (err) {
    console.error('GET /suppliers error:', err);
    return res.status(500).json({ message: 'Failed to retrieve suppliers' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/suppliers/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const row = db.prepare(`
      SELECT
        s.id, s.code, s.name, s.contact_person, s.email, s.phone,
        s.address, s.city, s.tax_id, s.payment_terms, s.notes, s.status,
        s.created_at, s.updated_at
      FROM suppliers s
      WHERE s.id = ?
    `).get(req.params.id);

    if (!row) return res.status(404).json({ message: 'Supplier not found' });
    return res.json({ supplier: buildSupplier(row) });
  } catch (err) {
    console.error('GET /suppliers/:id error:', err);
    return res.status(500).json({ message: 'Failed to retrieve supplier' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/suppliers
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      code, name, contactPerson, email, phone,
      address, city, taxId, paymentTerms, notes, status,
    } = req.body;

    // Validation
    if (!code?.trim()) return res.status(400).json({ message: 'Supplier code is required' });
    if (!name?.trim()) return res.status(400).json({ message: 'Supplier name is required' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (phone && !/^[+\d\s\-()]{7,20}$/.test(phone.trim())) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    const existing = db.prepare('SELECT id FROM suppliers WHERE code = ?').get(code.trim().toUpperCase());
    if (existing) return res.status(400).json({ message: `Supplier code ${code.trim().toUpperCase()} already exists` });

    const result = db.prepare(`
      INSERT INTO suppliers (code, name, contact_person, email, phone, address, city, tax_id, payment_terms, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code.trim().toUpperCase(),
      name.trim(),
      (contactPerson || '').trim(),
      (email || '').trim().toLowerCase(),
      (phone || '').trim(),
      (address || '').trim(),
      (city || '').trim(),
      (taxId || '').trim(),
      (paymentTerms || 'Net 30').trim(),
      (notes || '').trim(),
      ['Active', 'Inactive'].includes(status) ? status : 'Active'
    );

    const row = db.prepare(`
      SELECT id, code, name, contact_person, email, phone, address, city, tax_id, payment_terms, notes, status, created_at, updated_at
      FROM suppliers WHERE id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json({ message: 'Supplier created successfully', supplier: buildSupplier(row) });
  } catch (err) {
    console.error('POST /suppliers error:', err);
    return res.status(500).json({ message: err.message || 'Failed to create supplier' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/suppliers/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Supplier not found' });

    const {
      name, contactPerson, email, phone,
      address, city, taxId, paymentTerms, notes, status,
    } = req.body;

    if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (phone !== undefined && phone && !/^[+\d\s\-()]{7,20}$/.test(phone.trim())) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    db.prepare(`
      UPDATE suppliers SET
        name = ?,
        contact_person = ?,
        email = ?,
        phone = ?,
        address = ?,
        city = ?,
        tax_id = ?,
        payment_terms = ?,
        notes = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : existing.name,
      contactPerson !== undefined ? contactPerson.trim() : existing.contact_person,
      email !== undefined ? email.trim().toLowerCase() : existing.email,
      phone !== undefined ? phone.trim() : existing.phone,
      address !== undefined ? address.trim() : existing.address,
      city !== undefined ? city.trim() : existing.city,
      taxId !== undefined ? taxId.trim() : existing.tax_id,
      paymentTerms !== undefined ? paymentTerms.trim() : existing.payment_terms,
      notes !== undefined ? notes : existing.notes,
      status !== undefined && ['Active', 'Inactive'].includes(status) ? status : existing.status,
      id
    );

    const row = db.prepare(`
      SELECT id, code, name, contact_person, email, phone, address, city, tax_id, payment_terms, notes, status, created_at, updated_at
      FROM suppliers WHERE id = ?
    `).get(id);

    return res.json({ message: 'Supplier updated successfully', supplier: buildSupplier(row) });
  } catch (err) {
    console.error('PATCH /suppliers/:id error:', err);
    return res.status(500).json({ message: err.message || 'Failed to update supplier' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/suppliers/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Supplier not found' });

    const activeOrders = db.prepare(`
      SELECT COUNT(*) AS c FROM purchase_orders
      WHERE supplier_id = ? AND status NOT IN ('Canceled')
    `).get(id);

    if (activeOrders.c > 0) {
      return res.status(400).json({
        message: `Cannot delete supplier "${existing.name}". They have ${activeOrders.c} active or completed purchase order(s). Deactivate the supplier instead.`,
      });
    }

    db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    return res.json({ message: 'Supplier deleted successfully', id: Number(id) });
  } catch (err) {
    console.error('DELETE /suppliers/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete supplier' });
  }
});

module.exports = router;
