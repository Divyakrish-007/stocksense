const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('./auth');

// Helper to determine product status based on stock numbers
function determineStatus(quantity, minStockLevel) {
  const qty = parseInt(quantity, 10);
  const minStock = parseInt(minStockLevel, 10);
  if (qty === 0) return 'Out of Stock';
  if (qty <= minStock) return 'Low Stock';
  return 'In Stock';
}

// GET /api/products/meta - Metadata for filters and summaries
router.get('/meta', authenticateToken, (req, res) => {
  try {
    const categories = db
      .prepare('SELECT DISTINCT category FROM products ORDER BY category ASC')
      .all()
      .map((r) => r.category);

    const warehouses = db
      .prepare('SELECT code, name, location FROM warehouses ORDER BY code ASC')
      .all();

    const stats = db
      .prepare(`
        SELECT 
          COUNT(*) as total_skus,
          COALESCE(SUM(quantity), 0) as total_units,
          COALESCE(SUM(quantity * unit_price), 0) as total_valuation,
          COUNT(CASE WHEN quantity > 0 AND quantity <= min_stock_level THEN 1 END) as low_stock_count,
          COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock_count
        FROM products
      `)
      .get();

    return res.json({
      categories,
      warehouses,
      stats: {
        totalSkus: stats.total_skus,
        totalUnits: stats.total_units,
        totalValuation: Math.round(stats.total_valuation * 100) / 100,
        lowStockCount: stats.low_stock_count,
        outOfStockCount: stats.out_of_stock_count,
      },
    });
  } catch (error) {
    console.error('Error fetching product metadata:', error);
    return res.status(500).json({ message: 'Failed to retrieve product metadata' });
  }
});

// GET /api/products - List products with search, filter, and sorting
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, category, warehouse, status, sortBy, order } = req.query;

    let sql = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.quantity,
        p.min_stock_level,
        p.unit_price,
        p.warehouse_code,
        p.status,
        w.name as warehouse_name,
        w.location as warehouse_location
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_code = w.code
      WHERE 1=1
    `;
    const params = [];

    // Filter by search query (name or sku)
    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      sql += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      params.push(term, term);
    }

    // Filter by category
    if (category && category !== 'All') {
      sql += ' AND p.category = ?';
      params.push(category);
    }

    // Filter by warehouse
    if (warehouse && warehouse !== 'All') {
      sql += ' AND p.warehouse_code = ?';
      params.push(warehouse);
    }

    // Filter by status
    if (status && status !== 'All') {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    // Safe sorting
    const validSortCols = {
      name: 'p.name',
      sku: 'p.sku',
      quantity: 'p.quantity',
      unit_price: 'p.unit_price',
      category: 'p.category',
      status: 'p.status',
      id: 'p.id',
    };
    const sortColumn = validSortCols[sortBy] || 'p.id';
    const sortOrder = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

    const products = db.prepare(sql).all(...params);

    return res.json({
      count: products.length,
      products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ message: 'Failed to retrieve products list' });
  }
});

// GET /api/products/:id - Single product details
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const product = db
      .prepare(`
        SELECT 
          p.id,
          p.sku,
          p.name,
          p.category,
          p.quantity,
          p.min_stock_level,
          p.unit_price,
          p.warehouse_code,
          p.status,
          w.name as warehouse_name,
          w.location as warehouse_location
        FROM products p
        LEFT JOIN warehouses w ON p.warehouse_code = w.code
        WHERE p.id = ?
      `)
      .get(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json({ product });
  } catch (error) {
    console.error('Error fetching product by id:', error);
    return res.status(500).json({ message: 'Failed to retrieve product details' });
  }
});

// POST /api/products - Create a new product
router.post('/', authenticateToken, (req, res) => {
  try {
    const { sku, name, category, quantity, minStockLevel, unitPrice, warehouseCode } = req.body;

    // Validation
    if (!sku || !sku.trim()) {
      return res.status(400).json({ message: 'Product SKU / reference is required' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Product name is required' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ message: 'Product category is required' });
    }
    if (quantity === undefined || quantity === null || isNaN(Number(quantity)) || Number(quantity) < 0) {
      return res.status(400).json({ message: 'Stock quantity must be a non-negative number' });
    }
    if (minStockLevel === undefined || minStockLevel === null || isNaN(Number(minStockLevel)) || Number(minStockLevel) < 0) {
      return res.status(400).json({ message: 'Minimum stock alert level must be a non-negative number' });
    }
    if (unitPrice === undefined || unitPrice === null || isNaN(Number(unitPrice)) || Number(unitPrice) < 0) {
      return res.status(400).json({ message: 'Unit price must be a non-negative number' });
    }
    if (!warehouseCode || !warehouseCode.trim()) {
      return res.status(400).json({ message: 'Warehouse assignment is required' });
    }

    const cleanSku = sku.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanCategory = category.trim();
    const cleanWarehouse = warehouseCode.trim();
    const parsedQty = Math.floor(Number(quantity));
    const parsedMinStock = Math.floor(Number(minStockLevel));
    const parsedUnitPrice = Math.round(Number(unitPrice) * 100) / 100;

    // Check SKU uniqueness
    const existingSku = db.prepare('SELECT id FROM products WHERE UPPER(sku) = ?').get(cleanSku);
    if (existingSku) {
      return res.status(409).json({ message: `A product with SKU "${cleanSku}" already exists` });
    }

    // Check Warehouse exists
    const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(cleanWarehouse);
    if (!wh) {
      return res.status(400).json({ message: `Invalid warehouse location code: "${cleanWarehouse}"` });
    }

    const status = determineStatus(parsedQty, parsedMinStock);

    const insert = db.prepare(`
      INSERT INTO products (sku, name, category, quantity, min_stock_level, unit_price, warehouse_code, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      cleanSku,
      cleanName,
      cleanCategory,
      parsedQty,
      parsedMinStock,
      parsedUnitPrice,
      cleanWarehouse,
      status
    );

    const newProduct = db
      .prepare(`
        SELECT 
          p.id,
          p.sku,
          p.name,
          p.category,
          p.quantity,
          p.min_stock_level,
          p.unit_price,
          p.warehouse_code,
          p.status,
          w.name as warehouse_name,
          w.location as warehouse_location
        FROM products p
        LEFT JOIN warehouses w ON p.warehouse_code = w.code
        WHERE p.id = ?
      `)
      .get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Product added successfully to inventory',
      product: newProduct,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ message: 'Failed to create product record' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { sku, name, category, quantity, minStockLevel, unitPrice, warehouseCode } = req.body;

    const existingProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product record not found' });
    }

    // Validation
    if (!sku || !sku.trim()) {
      return res.status(400).json({ message: 'Product SKU / reference is required' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Product name is required' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ message: 'Product category is required' });
    }
    if (quantity === undefined || quantity === null || isNaN(Number(quantity)) || Number(quantity) < 0) {
      return res.status(400).json({ message: 'Stock quantity must be a non-negative number' });
    }
    if (minStockLevel === undefined || minStockLevel === null || isNaN(Number(minStockLevel)) || Number(minStockLevel) < 0) {
      return res.status(400).json({ message: 'Minimum stock alert level must be a non-negative number' });
    }
    if (unitPrice === undefined || unitPrice === null || isNaN(Number(unitPrice)) || Number(unitPrice) < 0) {
      return res.status(400).json({ message: 'Unit price must be a non-negative number' });
    }
    if (!warehouseCode || !warehouseCode.trim()) {
      return res.status(400).json({ message: 'Warehouse assignment is required' });
    }

    const cleanSku = sku.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanCategory = category.trim();
    const cleanWarehouse = warehouseCode.trim();
    const parsedQty = Math.floor(Number(quantity));
    const parsedMinStock = Math.floor(Number(minStockLevel));
    const parsedUnitPrice = Math.round(Number(unitPrice) * 100) / 100;

    // Check SKU uniqueness against other products
    const skuConflict = db
      .prepare('SELECT id FROM products WHERE UPPER(sku) = ? AND id != ?')
      .get(cleanSku, id);
    if (skuConflict) {
      return res.status(409).json({ message: `Another product already has SKU "${cleanSku}"` });
    }

    // Check Warehouse exists
    const wh = db.prepare('SELECT code FROM warehouses WHERE code = ?').get(cleanWarehouse);
    if (!wh) {
      return res.status(400).json({ message: `Invalid warehouse location code: "${cleanWarehouse}"` });
    }

    const status = determineStatus(parsedQty, parsedMinStock);

    const update = db.prepare(`
      UPDATE products 
      SET sku = ?, name = ?, category = ?, quantity = ?, min_stock_level = ?, unit_price = ?, warehouse_code = ?, status = ?
      WHERE id = ?
    `);

    update.run(
      cleanSku,
      cleanName,
      cleanCategory,
      parsedQty,
      parsedMinStock,
      parsedUnitPrice,
      cleanWarehouse,
      status,
      id
    );

    const updatedProduct = db
      .prepare(`
        SELECT 
          p.id,
          p.sku,
          p.name,
          p.category,
          p.quantity,
          p.min_stock_level,
          p.unit_price,
          p.warehouse_code,
          p.status,
          w.name as warehouse_name,
          w.location as warehouse_location
        FROM products p
        LEFT JOIN warehouses w ON p.warehouse_code = w.code
        WHERE p.id = ?
      `)
      .get(id);

    return res.json({
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ message: 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const existingProduct = db.prepare('SELECT id, name, sku FROM products WHERE id = ?').get(id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product record not found' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);

    return res.json({
      message: `Product "${existingProduct.name}" (${existingProduct.sku}) deleted successfully`,
      id: Number(id),
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ message: 'Failed to delete product' });
  }
});

module.exports = router;
