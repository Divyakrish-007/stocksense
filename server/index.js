const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initDatabase } = require('./db');
const { router: authRouter } = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const productsRouter = require('./routes/products');
const receiptsRouter = require('./routes/receipts');
const deliveryOrdersRouter = require('./routes/deliveryOrders');
const internalTransfersRouter = require('./routes/internalTransfers');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SQLite database and seed initial data
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/products', productsRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/delivery-orders', deliveryOrdersRouter);
app.use('/api/internal-transfers', internalTransfersRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'StockSense Modular Inventory Management System',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend build if dist folder exists
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`Serving static client files from ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // SPA fallback for React Router routes (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Start Express Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 StockSense Backend Server running on port ${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
  console.log(`📦 Database: SQLite (stocksense.db initialized)`);
  console.log(`💻 Web Application: http://localhost:${PORT}`);
  console.log(`=================================================`);
});
