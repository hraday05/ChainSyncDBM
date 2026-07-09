// ============================================
// replicationController.js — Replication API Handlers
// ============================================

const { indiaDb } = require('../config/db');
const ReplicationLog = require('../models/ReplicationLog');
const { compareRegions, replicateBlock, replicateWallets } = require('../services/replicationService');
const BlockModel = require('../models/Block');
const TransactionModel = require('../models/Transaction');

// POST /api/replication/sync — Full sync across all regions
async function syncAll(req, res) {
  try {
    const blocks = await BlockModel.getAllBlocks(indiaDb);
    const results = [];
    
    // Replicate each block (skip genesis block_id=1)
    for (const block of blocks) {
      if (block.block_id === 1) continue; // Skip genesis
      
      const transactions = await TransactionModel.getTransactionsByBlockId(indiaDb, block.block_id);
      
      try {
        const result = await replicateBlock('india', block, transactions);
        results.push({ block_id: block.block_id, replication: result });
      } catch (err) {
        results.push({ block_id: block.block_id, error: err.message });
      }
    }
    
    // Also sync wallets
    try {
      await replicateWallets('india', 'us');
      await replicateWallets('india', 'eu');
    } catch (err) {
      console.log('Wallet sync warning:', err.message);
    }
    
    res.json({
      message: 'Replication completed',
      blocks_processed: blocks.length - 1,
      results
    });
  } catch (error) {
    console.error('Error syncing:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
}

// GET /api/replication/status — Get replication logs
async function getStatus(req, res) {
  try {
    const logs = await ReplicationLog.getAllLogs(indiaDb);
    const pending = logs.filter(l => l.status === 'pending').length;
    const synced = logs.filter(l => l.status === 'synced').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    
    res.json({
      summary: { total: logs.length, pending, synced, failed },
      logs
    });
  } catch (error) {
    console.error('Error fetching replication status:', error);
    res.status(500).json({ error: 'Failed to fetch status', details: error.message });
  }
}

// GET /api/replication/compare — Compare data across regions
async function compare(req, res) {
  try {
    const result = await compareRegions();
    res.json(result);
  } catch (error) {
    console.error('Error comparing regions:', error);
    res.status(500).json({ error: 'Failed to compare regions', details: error.message });
  }
}

module.exports = {
  syncAll,
  getStatus,
  compare
};
