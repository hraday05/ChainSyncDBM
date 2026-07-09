// ============================================
// server.js — ChainSync Express Entry Point
// ============================================
// This is the main file that starts everything.
// It sets up Express, middleware, routes, and connects to databases.
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testAllConnections } = require('./config/db');

// Import routes
const walletRoutes = require('./routes/walletRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const blockRoutes = require('./routes/blockRoutes');
const replicationRoutes = require('./routes/replicationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const databaseRoutes = require('./routes/databaseRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- MIDDLEWARE ----
// cors: Allows frontend (running on different port) to talk to this API
app.use(cors());
// json: Parses incoming JSON request bodies (e.g., from Postman)
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ---- API ROUTES ----
app.use('/api/wallets', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/replication', replicationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/database', databaseRoutes);

// ---- ROOT ROUTE ----
app.get('/api', (req, res) => {
  res.json({
    name: 'ChainSync API',
    version: '1.0.0',
    description: 'Blockchain-Inspired Distributed Transaction Verification System',
    endpoints: {
      wallets: {
        'POST /api/wallets': 'Create a new wallet',
        'GET /api/wallets': 'List all wallets',
        'GET /api/wallets/:username': 'Get wallet details'
      },
      transactions: {
        'POST /api/transactions': 'Create a transaction (goes to mempool)',
        'GET /api/transactions': 'List all transactions (?status=pending|confirmed)',
        'GET /api/transactions/:id': 'Get single transaction',
        'GET /api/transactions/:id/verify': 'Verify transaction integrity',
        'GET /api/transactions/stats': 'Transaction statistics'
      },
      blocks: {
        'POST /api/blocks/mine': 'Mine a new block (Proof of Work)',
        'GET /api/blocks': 'List all blocks (blockchain)',
        'GET /api/blocks/:id': 'Get block with transactions',
        'GET /api/blocks/verify-chain': 'Verify entire blockchain integrity'
      },
      replication: {
        'POST /api/replication/sync': 'Sync data to all regions',
        'GET /api/replication/status': 'Get replication logs',
        'GET /api/replication/compare': 'Compare data across regions'
      },
      audit: {
        'GET /api/audit': 'Get audit logs (?event_type=...&limit=20)'
      }
    }
  });
});

// Serve frontend for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

// ---- START SERVER ----
async function start() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║         ⛓️  ChainSync Server Starting        ║');
  console.log('╚══════════════════════════════════════════════╝');
  
  // Test database connections
  try {
    const connections = await testAllConnections();
    
    if (!connections.india) {
      console.error('\n❌ Cannot start: India (primary) database is not available.');
      console.error('   Run: docker-compose up -d');
      process.exit(1);
    }
    
    if (!connections.us || !connections.eu) {
      console.log('\n⚠️  Some secondary databases are offline. Replication may not work.');
    }
  } catch (error) {
    console.error('\n❌ Database connection failed:', error.message);
    console.error('   Make sure Docker containers are running: docker-compose up -d');
    process.exit(1);
  }
  
  // Start Express server
  app.listen(PORT, () => {
    console.log(`\n🚀 ChainSync server running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard at http://localhost:${PORT}`);
    console.log(`📡 API docs at http://localhost:${PORT}/api\n`);
  });
}

start();
