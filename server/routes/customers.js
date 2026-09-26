const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// Helper: build full customer object with sales order stats
function buildCustomer(row) {
  const soStats = db.prepare(`
    SELECT
      COUNT(*) AS total_orders,
      COALESCE(SUM(grand_total), 0) AS total_value
    FROM sales_orders
    WHERE customer = ? OR customer = ?
  `).get(row.name, row.code);

  return {
    ...row,
    total_orders: soStats ? soStats.total_orders : 0,
    total_value:  soStats ? Number(soStats.total_value) : 0,
  };
}

// GET /api/customers/meta
router.get('/meta', authenticateToken, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) AS active,
        COUNT(CASE WHEN status = 'Inactive' THEN 1 END) AS inactive
      FROM customers
    `).get();

    const totalOrders = db.prepare(`SELECT COUNT(*) AS c FROM sales_orders`).get().c;

    const cities = db.prepare(`
      SELECT DISTINCT city FROM customers WHERE city != '' ORDER BY city ASC
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
    console.error('customers/meta error:', err);
    return res.status(500).json({ message: 'Failed to retrieve customers metadata' });
  }
});

// GET /api/customers
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, status, city, sortBy = 'id', order = 'ASC' } = req.query;

    let sql = `
      SELECT
        c.id, c.code, c.name, c.contact_person, c.email, c.phone,
        c.address, c.city, c.tax_id, c.payment_terms, c.notes, c.status,
        c.created_at, c.updated_at,
        COUNT(DISTINCT so.id) AS total_orders,
        COALESCE(SUM(so.grand_total), 0) AS total_value
      FROM customers c
      LEFT JOIN sales_orders so ON (so.customer = c.name OR so.customer = c.code)
      WHERE 1=1
    `;
    const params = [];

    if (search?.trim()) {
      sql += ` AND (c.code LIKE ? OR c.name LIKE ? OR c.contact_person LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)`;
      const q = `%${search.trim()}%`;
      params.push(q, q, q, q, q);
    }
    if (status && status !== 'All') {
      sql += ` AND c.status = ?`;
      params.push(status);
    }
    if (city && city !== 'All') {
      sql += ` AND c.city = ?`;
      params.push(city);
    }

    sql += ` GROUP BY c.id`;

    const allowedSort = {
      id:           'c.id',
      code:         'c.code',
      name:         'c.name',
      total_orders: 'total_orders',
      total_value:  'total_value',
    };
    const sf = allowedSort[sortBy] || 'c.id';
    const so = order === 'DESC' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${sf} ${so}`;

    const customers = db.prepare(sql).all(...params);
    return res.json({ count: customers.length, customers });
  } catch (err) {
    console.error('GET /customers error:', err);
    return res.status(500).json({ message: 'Failed to retrieve customers' });
  }
});

// GET /api/customers/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const row = db.prepare(`
      SELECT
        c.id, c.code, c.name, c.contact_person, c.email, c.phone,
        c.address, c.city, c.tax_id, c.payment_terms, c.notes, c.status,
        c.created_at, c.updated_at
      FROM customers c
      WHERE c.id = ?
    `).get(req.params.id);

    if (!row) return res.status(404).json({ message: 'Customer not found' });
    return res.json({ customer: buildCustomer(row) });
  } catch (err) {
    console.error('GET /customers/:id error:', err);
    return res.status(500).json({ message: 'Failed to retrieve customer' });
  }
});

// POST /api/customers
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      code, name, contactPerson, email, phone,
      address, city, taxId, paymentTerms, notes, status,
    } = req.body;

    if (!code?.trim()) return res.status(400).json({ message: 'Customer code is required' });
    if (!name?.trim()) return res.status(400).json({ message: 'Customer name is required' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (phone && !/^[+\d\s\-()]{7,20}$/.test(phone.trim())) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    const existing = db.prepare('SELECT id FROM customers WHERE code = ?').get(code.trim().toUpperCase());
    if (existing) return res.status(400).json({ message: `Customer code ${code.trim().toUpperCase()} already exists` });

    const result = db.prepare(`
      INSERT INTO customers (code, name, contact_person, email, phone, address, city, tax_id, payment_terms, notes, status)
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
      FROM customers WHERE id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json({ message: 'Customer created successfully', customer: buildCustomer(row) });
  } catch (err) {
    console.error('POST /customers error:', err);
    return res.status(500).json({ message: err.message || 'Failed to create customer' });
  }
});

// PATCH /api/customers/:id
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Customer not found' });

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
      UPDATE customers SET
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
      FROM customers WHERE id = ?
    `).get(id);

    return res.json({ message: 'Customer updated successfully', customer: buildCustomer(row) });
  } catch (err) {
    console.error('PATCH /customers/:id error:', err);
    return res.status(500).json({ message: err.message || 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Customer not found' });

    const activeOrders = db.prepare(`
      SELECT COUNT(*) AS c FROM sales_orders
      WHERE (customer = ? OR customer = ?) AND status NOT IN ('Canceled')
    `).get(existing.name, existing.code);

    if (activeOrders.c > 0) {
      return res.status(400).json({
        message: `Cannot delete customer "${existing.name}". They have ${activeOrders.c} active or completed sales order(s). Deactivate the customer instead.`,
      });
    }

    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return res.json({ message: 'Customer deleted successfully', id: Number(id) });
  } catch (err) {
    console.error('DELETE /customers/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete customer' });
  }
});

module.exports = router;
