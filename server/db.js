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
}

module.exports = {
  db,
  initDatabase,
};
