const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'stocksense.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  console.log('Initializing StockSense Database...');

  // Create Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Inventory Manager',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Password Resets Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Warehouses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      capacity INTEGER NOT NULL
    );
  `);

  // Create Products Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      min_stock_level INTEGER NOT NULL DEFAULT 10,
      unit_price REAL NOT NULL DEFAULT 0.0,
      warehouse_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'In Stock'
    );
  `);

  // Create Inventory Activities / Operations Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL, -- Receipts, Delivery, Internal, Adjustments
      contact TEXT NOT NULL, -- Vendor, Customer, or Internal Unit
      source_location TEXT NOT NULL,
      dest_location TEXT NOT NULL,
      category TEXT NOT NULL,
      items_count INTEGER NOT NULL,
      scheduled_date TEXT NOT NULL,
      status TEXT NOT NULL, -- Draft, Waiting, Ready, Done, Canceled
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Receipts Table (dedicated module table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      vendor TEXT NOT NULL,
      warehouse_code TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Receipt Line Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
  `);

  // Create Delivery Orders Table (dedicated module table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      customer TEXT NOT NULL,
      warehouse_code TEXT NOT NULL,
      destination_address TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Delivery Order Line Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
  `);

  // Create Internal Transfers Table (dedicated module table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS internal_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      source_warehouse_code TEXT NOT NULL,
      dest_warehouse_code TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Internal Transfer Line Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS internal_transfer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      internal_transfer_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (internal_transfer_id) REFERENCES internal_transfers(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
  `);

  // Create Product Warehouse Stock Table for Granular Multi-Facility Tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_warehouse_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      warehouse_code TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      UNIQUE(product_id, warehouse_code),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // Create Inventory Adjustments Table (dedicated module table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      warehouse_code TEXT NOT NULL,
      reason TEXT NOT NULL,
      adjustment_type TEXT NOT NULL, -- 'Increase', 'Decrease', 'Set'
      status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Waiting', 'Done', 'Canceled'
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warehouse_code) REFERENCES warehouses(code) ON DELETE RESTRICT
    );
  `);

  // Create Inventory Adjustment Line Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adjustment_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      previous_quantity INTEGER NOT NULL DEFAULT 0,
      adjusted_quantity INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (adjustment_id) REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
  `);

  seedData();
}

function seedData() {
  // Seed Users if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('Seeding initial users...');
    const hashedPassword = bcrypt.hashSync('Password@123', 10);
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `);

    insertUser.run('Alex Mercer (Manager)', 'admin@stocksense.io', hashedPassword, 'Inventory Manager');
    insertUser.run('Sarah Jenkins (Staff)', 'staff@stocksense.io', hashedPassword, 'Warehouse Staff');
  }

  // Seed Warehouses if empty
  const whCount = db.prepare('SELECT COUNT(*) as count FROM warehouses').get().count;
  if (whCount === 0) {
    console.log('Seeding warehouses...');
    const insertWH = db.prepare(`
      INSERT INTO warehouses (code, name, location, capacity)
      VALUES (?, ?, ?, ?)
    `);

    insertWH.run('WH-MAIN', 'Central Distribution Center', 'Zone A - Chicago', 50000);
    insertWH.run('WH-NORTH', 'North Regional Depot', 'Zone B - Detroit', 25000);
    insertWH.run('WH-EAST', 'East Logistics Hub', 'Zone C - Newark', 35000);
    insertWH.run('WH-COLD', 'Cold Storage Logistics', 'Zone D - Milwaukee', 15000);
  }

  // Seed Products if empty
  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (prodCount === 0) {
    console.log('Seeding products...');
    const insertProd = db.prepare(`
      INSERT INTO products (sku, name, category, quantity, min_stock_level, unit_price, warehouse_code, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const products = [
      ['SKU-ELC-001', 'Microcontroller MCU-32', 'Electronics', 1240, 200, 14.50, 'WH-MAIN', 'In Stock'],
      ['SKU-ELC-002', 'Power Converter 24V 5A', 'Electronics', 48, 50, 28.00, 'WH-MAIN', 'Low Stock'],
      ['SKU-ELC-003', 'Optical Sensor Module V2', 'Electronics', 0, 30, 42.00, 'WH-NORTH', 'Out of Stock'],
      ['SKU-RAW-101', 'Aluminum Extrusion Bar 2m', 'Raw Materials', 340, 100, 22.00, 'WH-MAIN', 'In Stock'],
      ['SKU-RAW-102', 'Stainless Steel Sheets 1mm', 'Raw Materials', 15, 40, 85.00, 'WH-EAST', 'Low Stock'],
      ['SKU-RAW-103', 'Copper Wire Spool 500m', 'Raw Materials', 88, 25, 110.00, 'WH-MAIN', 'In Stock'],
      ['SKU-PKG-201', 'Corrugated Shipping Boxes (L)', 'Packaging', 2150, 500, 2.10, 'WH-NORTH', 'In Stock'],
      ['SKU-PKG-202', 'Thermal Bubble Wrap 100m', 'Packaging', 32, 50, 24.50, 'WH-EAST', 'Low Stock'],
      ['SKU-PKG-203', 'Heavy-Duty Pallet Wrap', 'Packaging', 180, 40, 18.00, 'WH-MAIN', 'In Stock'],
      ['SKU-FNG-301', 'Industrial Router Pro', 'Finished Goods', 145, 30, 340.00, 'WH-MAIN', 'In Stock'],
      ['SKU-FNG-302', 'Smart Gateway Hub v4', 'Finished Goods', 0, 20, 210.00, 'WH-NORTH', 'Out of Stock'],
      ['SKU-FNG-303', 'Wireless Telemetry Unit', 'Finished Goods', 8, 25, 490.00, 'WH-COLD', 'Low Stock'],
      ['SKU-HRD-401', 'Hex Flange Bolts M8x25 (100pk)', 'Hardware', 520, 100, 9.50, 'WH-EAST', 'In Stock'],
      ['SKU-HRD-402', 'High-Tensile Steel Rivets (500pk)', 'Hardware', 12, 50, 16.00, 'WH-MAIN', 'Low Stock'],
      ['SKU-HRD-403', 'Silicone Sealant Cartridge', 'Hardware', 94, 30, 7.80, 'WH-COLD', 'In Stock'],
      ['SKU-ELC-004', 'Lithium Battery Pack 12V', 'Electronics', 65, 20, 95.00, 'WH-COLD', 'In Stock'],
    ];

    for (const p of products) {
      insertProd.run(...p);
    }
  }

  // Seed Inventory Activities if empty
  const actCount = db.prepare('SELECT COUNT(*) as count FROM inventory_activities').get().count;
  if (actCount === 0) {
    console.log('Seeding inventory activities...');
    const insertAct = db.prepare(`
      INSERT INTO inventory_activities (reference, type, contact, source_location, dest_location, category, items_count, scheduled_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const activities = [
      ['REC-2026-0041', 'Receipts', 'Apex Micro Semi Corp', 'Vendor / Inbound', 'WH-MAIN', 'Electronics', 500, '2026-09-26', 'Ready', 'Inbound verification pending docking bay 4'],
      ['REC-2026-0042', 'Receipts', 'Global Metalcraft Inc', 'Vendor / Inbound', 'WH-EAST', 'Raw Materials', 120, '2026-09-27', 'Waiting', 'Awaiting bill of lading customs clearance'],
      ['REC-2026-0043', 'Receipts', 'PackPro Logistics Ltd', 'Vendor / Inbound', 'WH-NORTH', 'Packaging', 1500, '2026-09-28', 'Draft', 'PO #4928 generated, vendor scheduling delivery'],
      ['REC-2026-0044', 'Receipts', 'Vanguard Fasteners', 'Vendor / Inbound', 'WH-MAIN', 'Hardware', 850, '2026-09-25', 'Done', 'Received, QC inspected and racked in Aisle 3'],
      ['REC-2026-0045', 'Receipts', 'Nordic Polymers Gmbh', 'Vendor / Inbound', 'WH-COLD', 'Raw Materials', 200, '2026-09-24', 'Canceled', 'Order cancelled due to supplier price discrepancy'],

      ['DEL-2026-0118', 'Delivery', 'OmniTech Enterprise Systems', 'WH-MAIN', 'Customer Delivery', 'Finished Goods', 45, '2026-09-26', 'Ready', 'Staged in Staging Lane 2 ready for courier pickup'],
      ['DEL-2026-0119', 'Delivery', 'Metro Industrial Supply', 'WH-EAST', 'Customer Delivery', 'Hardware', 300, '2026-09-26', 'Waiting', 'Awaiting packaging pallet wrap confirmation'],
      ['DEL-2026-0120', 'Delivery', 'Summit Automations Inc', 'WH-NORTH', 'Customer Delivery', 'Electronics', 90, '2026-09-27', 'Draft', 'Pending final customer credit check approval'],
      ['DEL-2026-0121', 'Delivery', 'Pinnacle Aerospace', 'WH-MAIN', 'Customer Delivery', 'Raw Materials', 60, '2026-09-25', 'Done', 'Dispatched via Express Freight. Tracking #TRK-8812'],
      ['DEL-2026-0122', 'Delivery', 'Pacific Dynamics Ltd', 'WH-COLD', 'Customer Delivery', 'Finished Goods', 15, '2026-09-23', 'Canceled', 'Customer revised order to next delivery quarter'],

      ['INT-2026-0031', 'Internal', 'Inter-Warehouse Replenishment', 'WH-MAIN', 'WH-NORTH', 'Electronics', 150, '2026-09-26', 'Ready', 'Transfer pallet staged at bay 1 ready for shuttle truck'],
      ['INT-2026-0032', 'Internal', 'Assembly Line Feed Depot', 'WH-MAIN', 'WH-EAST', 'Raw Materials', 80, '2026-09-27', 'Waiting', 'Scheduled for Tuesday regular shuttle circuit'],
      ['INT-2026-0033', 'Internal', 'Seasonal Stock Rebalancing', 'WH-EAST', 'WH-COLD', 'Finished Goods', 25, '2026-09-28', 'Draft', 'Manager review requested for temperature constraints'],
      ['INT-2026-0034', 'Internal', 'Packaging Line Replenish', 'WH-NORTH', 'WH-MAIN', 'Packaging', 600, '2026-09-25', 'Done', 'Transferred and verified on arrival'],
      ['INT-2026-0035', 'Internal', 'Emergency Fastener Shift', 'WH-EAST', 'WH-NORTH', 'Hardware', 100, '2026-09-24', 'Done', 'Transferred via expedited internal courier'],

      ['ADJ-2026-0008', 'Adjustments', 'Cycle Count Team Q3', 'WH-MAIN', 'Physical Count Rec', 'Electronics', -2, '2026-09-26', 'Ready', 'Variance found during morning cycle audit in Bin B-14'],
      ['ADJ-2026-0009', 'Adjustments', 'Annual Physical Inventory', 'WH-NORTH', 'Physical Count Rec', 'Packaging', 15, '2026-09-27', 'Waiting', 'Surplus found on pallet top rack requiring manager sign-off'],
      ['ADJ-2026-0010', 'Adjustments', 'Damaged Packaging Write-off', 'WH-EAST', 'Scrap / Quarantine', 'Raw Materials', -4, '2026-09-25', 'Done', 'Water leak damage approved by warehouse lead for salvage'],
      ['ADJ-2026-0011', 'Adjustments', 'Barcode Calibration Drift', 'WH-COLD', 'System Recalibration', 'Hardware', 5, '2026-09-24', 'Done', 'SKU scan mismatch rectified during shelf audit'],
      ['ADJ-2026-0012', 'Adjustments', 'Sample Testing Deduction', 'WH-MAIN', 'R&D Quality Lab', 'Electronics', -1, '2026-09-28', 'Draft', 'Pending engineering sign-off for destructive test'],
    ];

    for (const a of activities) {
      insertAct.run(...a);
    }
  }

  console.log('StockSense Database initialization complete.');
  seedReceipts();
  seedDeliveryOrders();
  syncInitialWarehouseStock();
  seedInternalTransfers();
  seedInventoryAdjustments();
}

function seedReceipts() {
  // Only seed if the receipts table exists AND is empty
  try {
    const count = db.prepare('SELECT COUNT(*) as c FROM receipts').get().c;
    if (count > 0) return;

    console.log('Seeding receipts module data...');

    // Grab some products to reference
    const products = db.prepare('SELECT id, sku FROM products ORDER BY id LIMIT 8').all();
    if (products.length === 0) return;

    const insertReceipt = db.prepare(`
      INSERT INTO receipts (reference, vendor, warehouse_code, scheduled_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db.prepare(`
      INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?, ?, ?)
    `);

    const receiptsData = [
      { ref: 'REC-2026-1001', vendor: 'Apex Micro Semi Corp',   wh: 'WH-MAIN',  date: '2026-09-26', status: 'Ready',   notes: 'Inbound verification pending docking bay 4', items: [{pid: products[0].id, qty: 500}, {pid: products[1].id, qty: 200}] },
      { ref: 'REC-2026-1002', vendor: 'Global Metalcraft Inc',  wh: 'WH-EAST',  date: '2026-09-27', status: 'Waiting', notes: 'Awaiting bill of lading customs clearance',    items: [{pid: products[2] ? products[2].id : products[0].id, qty: 120}] },
      { ref: 'REC-2026-1003', vendor: 'PackPro Logistics Ltd',  wh: 'WH-NORTH', date: '2026-09-28', status: 'Draft',   notes: 'PO #4928 generated, vendor scheduling delivery', items: [{pid: products[3] ? products[3].id : products[0].id, qty: 1500}] },
      { ref: 'REC-2026-1004', vendor: 'Vanguard Fasteners',     wh: 'WH-MAIN',  date: '2026-09-25', status: 'Done',    notes: 'Received, QC inspected and racked in Aisle 3', items: [{pid: products[4] ? products[4].id : products[0].id, qty: 850}] },
      { ref: 'REC-2026-1005', vendor: 'Nordic Polymers GmbH',   wh: 'WH-COLD',  date: '2026-09-24', status: 'Canceled',notes: 'Cancelled due to supplier price discrepancy',  items: [{pid: products[5] ? products[5].id : products[0].id, qty: 200}] },
    ];

    for (const r of receiptsData) {
      const result = insertReceipt.run(r.ref, r.vendor, r.wh, r.date, r.status, r.notes);
      for (const item of r.items) {
        insertItem.run(result.lastInsertRowid, item.pid, item.qty);
      }
    }
  } catch (err) {
    console.error('Receipt seed error (non-fatal):', err.message);
  }
}

function seedDeliveryOrders() {
  // Only seed if delivery_orders table exists AND is empty
  try {
    const count = db.prepare('SELECT COUNT(*) as c FROM delivery_orders').get().c;
    if (count > 0) return;

    console.log('Seeding delivery orders module data...');

    const products = db.prepare('SELECT id, sku FROM products ORDER BY id LIMIT 8').all();
    if (products.length === 0) return;

    const insertDO = db.prepare(`
      INSERT INTO delivery_orders (reference, customer, warehouse_code, destination_address, scheduled_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db.prepare(`
      INSERT INTO delivery_order_items (delivery_order_id, product_id, quantity) VALUES (?, ?, ?)
    `);

    const deliveryData = [
      {
        ref: 'DO-2026-2001',
        customer: 'Omni Retail Group',
        wh: 'WH-MAIN',
        destination: '742 Evergreen Blvd, Chicago, IL',
        date: '2026-09-27',
        status: 'Ready',
        notes: 'Priority dispatch staging at Lane 2 for morning courier pickup',
        items: [{ pid: products[0].id, qty: 20 }, { pid: products[1].id, qty: 15 }],
      },
      {
        ref: 'DO-2026-2002',
        customer: 'Pacific Industrial Supply',
        wh: 'WH-EAST',
        destination: '1200 Harbor Way, Newark, NJ',
        date: '2026-09-28',
        status: 'Waiting',
        notes: 'Awaiting customer freight carrier dispatch confirmation',
        items: [{ pid: products[2] ? products[2].id : products[0].id, qty: 10 }],
      },
      {
        ref: 'DO-2026-2003',
        customer: 'Apex Automotive Systems',
        wh: 'WH-NORTH',
        destination: '450 Woodward Ave, Detroit, MI',
        date: '2026-09-29',
        status: 'Draft',
        notes: 'Quote approved, final packing slip pending warehouse review',
        items: [{ pid: products[3] ? products[3].id : products[0].id, qty: 25 }],
      },
      {
        ref: 'DO-2026-2004',
        customer: 'Metro Regional Hospital',
        wh: 'WH-MAIN',
        destination: '890 Healthcare Dr, Milwaukee, WI',
        date: '2026-09-25',
        status: 'Done',
        notes: 'Outbound courier delivery signed and completed successfully',
        items: [{ pid: products[4] ? products[4].id : products[0].id, qty: 30 }],
      },
      {
        ref: 'DO-2026-2005',
        customer: 'Horizon Construction Co',
        wh: 'WH-COLD',
        destination: '300 State St, Madison, WI',
        date: '2026-09-24',
        status: 'Canceled',
        notes: 'Order canceled by customer prior to pallet picking',
        items: [{ pid: products[5] ? products[5].id : products[0].id, qty: 5 }],
      },
    ];

    for (const d of deliveryData) {
      const result = insertDO.run(d.ref, d.customer, d.wh, d.destination, d.date, d.status, d.notes);
      for (const item of d.items) {
        insertItem.run(result.lastInsertRowid, item.pid, item.qty);
      }
    }
  } catch (err) {
    console.error('Delivery orders seed error (non-fatal):', err.message);
  }
}

function syncInitialWarehouseStock() {
  try {
    const products = db.prepare('SELECT id, warehouse_code, quantity FROM products').all();
    const warehouses = db.prepare('SELECT code FROM warehouses').all();
    const insertPWS = db.prepare(`
      INSERT OR IGNORE INTO product_warehouse_stock (product_id, warehouse_code, quantity)
      VALUES (?, ?, ?)
    `);

    for (const p of products) {
      // Primary warehouse has the product's quantity
      insertPWS.run(p.id, p.warehouse_code, p.quantity);
      // Other facilities have 0 initially
      for (const wh of warehouses) {
        if (wh.code !== p.warehouse_code) {
          insertPWS.run(p.id, wh.code, 0);
        }
      }
    }
  } catch (err) {
    console.error('syncInitialWarehouseStock error:', err.message);
  }
}

function seedInternalTransfers() {
  try {
    const count = db.prepare('SELECT COUNT(*) as c FROM internal_transfers').get().c;
    if (count > 0) return;

    console.log('Seeding internal transfers module data...');

    const products = db.prepare('SELECT id, sku, warehouse_code, quantity FROM products ORDER BY id').all();
    if (products.length === 0) return;

    const insertIT = db.prepare(`
      INSERT INTO internal_transfers (reference, source_warehouse_code, dest_warehouse_code, scheduled_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db.prepare(`
      INSERT INTO internal_transfer_items (internal_transfer_id, product_id, quantity) VALUES (?, ?, ?)
    `);

    const transferData = [
      {
        ref: 'IT-2026-3001',
        src: 'WH-MAIN',
        dest: 'WH-NORTH',
        date: '2026-09-28',
        status: 'Ready',
        notes: 'Regional inventory rebalancing for upcoming promotional intake',
        items: [{ pid: products[0].id, qty: 50 }],
      },
      {
        ref: 'IT-2026-3002',
        src: 'WH-NORTH',
        dest: 'WH-EAST',
        date: '2026-09-29',
        status: 'Waiting',
        notes: 'Packaging supplies transfer to East Logistics Hub',
        items: [{ pid: products[6] ? products[6].id : products[0].id, qty: 100 }],
      },
      {
        ref: 'IT-2026-3003',
        src: 'WH-EAST',
        dest: 'WH-MAIN',
        date: '2026-09-30',
        status: 'Draft',
        notes: 'Fasteners allocation replenishment for central production assembly',
        items: [{ pid: products[7] ? products[7].id : products[0].id, qty: 30 }],
      },
      {
        ref: 'IT-2026-3004',
        src: 'WH-MAIN',
        dest: 'WH-COLD',
        date: '2026-09-25',
        status: 'Done',
        notes: 'Completed stock shuttle transfer verified by both warehouse managers',
        items: [{ pid: products[1] ? products[1].id : products[0].id, qty: 10 }],
      },
      {
        ref: 'IT-2026-3005',
        src: 'WH-COLD',
        dest: 'WH-MAIN',
        date: '2026-09-24',
        status: 'Canceled',
        notes: 'Canceled due to shuttle refrigeration maintenance window',
        items: [{ pid: products[2] ? products[2].id : products[0].id, qty: 5 }],
      },
    ];

    for (const t of transferData) {
      const result = insertIT.run(t.ref, t.src, t.dest, t.date, t.status, t.notes);
      for (const item of t.items) {
        insertItem.run(result.lastInsertRowid, item.pid, item.qty);
      }
    }
  } catch (err) {
    console.error('Internal transfers seed error (non-fatal):', err.message);
  }
}

function seedInventoryAdjustments() {
  try {
    const count = db.prepare('SELECT COUNT(*) as c FROM inventory_adjustments').get().c;
    if (count > 0) return;

    console.log('Seeding inventory adjustments module data...');

    const products = db.prepare('SELECT id, sku, quantity, warehouse_code FROM products ORDER BY id').all();
    if (products.length === 0) return;

    const insertAdj = db.prepare(`
      INSERT INTO inventory_adjustments (reference, warehouse_code, reason, adjustment_type, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO inventory_adjustment_items (adjustment_id, product_id, quantity, previous_quantity, adjusted_quantity)
      VALUES (?, ?, ?, ?, ?)
    `);

    const seedData = [
      {
        ref: 'ADJ-2026-1001',
        wh: 'WH-MAIN',
        reason: 'Annual Physical Inventory Audit',
        type: 'Increase',
        status: 'Done',
        notes: 'Found additional pallet during annual audit in aisle 4',
        createdAt: '2026-09-24 10:30:00',
        items: [{ pid: products[0].id, qty: 10, prev: 1230, adj: 1240 }],
      },
      {
        ref: 'ADJ-2026-1002',
        wh: 'WH-EAST',
        reason: 'Damaged Packaging Write-off',
        type: 'Decrease',
        status: 'Done',
        notes: 'Water leak damage approved by warehouse lead for salvage scrap',
        createdAt: '2026-09-25 14:15:00',
        items: [{ pid: products[4] ? products[4].id : products[0].id, qty: 4, prev: 19, adj: 15 }],
      },
      {
        ref: 'ADJ-2026-1003',
        wh: 'WH-MAIN',
        reason: 'Routine ABC Cycle Count',
        type: 'Set',
        status: 'Ready',
        notes: 'Physical count verified by cycle count team Q3',
        createdAt: '2026-09-26 09:00:00',
        items: [{ pid: products[1] ? products[1].id : products[0].id, qty: 48, prev: 50, adj: 48 }],
      },
      {
        ref: 'ADJ-2026-1004',
        wh: 'WH-NORTH',
        reason: 'Supplier Shortage Reconciliation',
        type: 'Decrease',
        status: 'Waiting',
        notes: 'Discrepancy reported during receiving inspection, awaiting vendor credit',
        createdAt: '2026-09-27 11:45:00',
        items: [{ pid: products[6] ? products[6].id : products[0].id, qty: 20, prev: 2150, adj: 2130 }],
      },
      {
        ref: 'ADJ-2026-1005',
        wh: 'WH-COLD',
        reason: 'Barcode Calibration Drift Correction',
        type: 'Increase',
        status: 'Draft',
        notes: 'SKU scan mismatch rectified during weekly shelf audit',
        createdAt: '2026-09-28 16:20:00',
        items: [{ pid: products[14] ? products[14].id : products[0].id, qty: 5, prev: 89, adj: 94 }],
      },
      {
        ref: 'ADJ-2026-1006',
        wh: 'WH-MAIN',
        reason: 'Sample Testing Deduction',
        type: 'Decrease',
        status: 'Canceled',
        notes: 'Destructive R&D testing canceled by product engineering',
        createdAt: '2026-09-23 08:00:00',
        items: [{ pid: products[0].id, qty: 2, prev: 1240, adj: 1238 }],
      },
    ];

    for (const d of seedData) {
      const res = insertAdj.run(d.ref, d.wh, d.reason, d.type, d.status, d.notes, d.createdAt, d.createdAt);
      for (const it of d.items) {
        insertItem.run(res.lastInsertRowid, it.pid, it.qty, it.prev, it.adj);
      }
    }
  } catch (err) {
    console.error('Inventory adjustments seed error (non-fatal):', err.message);
  }
}

function getWarehouseStock(productId, warehouseCode) {
  const row = db
    .prepare('SELECT quantity FROM product_warehouse_stock WHERE product_id = ? AND warehouse_code = ?')
    .get(productId, warehouseCode);
  if (row) return row.quantity;
  const prod = db.prepare('SELECT quantity, warehouse_code FROM products WHERE id = ?').get(productId);
  if (prod && prod.warehouse_code === warehouseCode) return prod.quantity;
  return 0;
}

function setWarehouseStock(productId, warehouseCode, quantity) {
  db.prepare(`
    INSERT INTO product_warehouse_stock (product_id, warehouse_code, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(product_id, warehouse_code) DO UPDATE SET quantity = excluded.quantity
  `).run(productId, warehouseCode, quantity);
}

function adjustWarehouseStock(productId, warehouseCode, delta) {
  db.prepare(`
    INSERT INTO product_warehouse_stock (product_id, warehouse_code, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(product_id, warehouse_code) DO UPDATE SET quantity = quantity + excluded.quantity
  `).run(productId, warehouseCode, delta);
}

module.exports = {
  db,
  initDatabase,
  getWarehouseStock,
  setWarehouseStock,
  adjustWarehouseStock,
};
