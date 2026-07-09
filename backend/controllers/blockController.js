// ============================================
// blockController.js — Block & Mining API Handlers
// ============================================

const { indiaDb } = require('../config/db');
const BlockModel = require('../models/Block');
const TransactionModel = require('../models/Transaction');
const WalletModel = require('../models/Wallet');
const AuditLog = require('../models/AuditLog');
const { buildMerkleRoot, buildMerkleTree } = require('../services/merkleService');
const { mineBlock } = require('../services/miningService');
const { verifyChain } = require('../services/verificationService');
const { replicateBlock } = require('../services/replicationService');

// POST /api/blocks/mine — Mine a new block
async function mine(req, res) {
  try {
    // Step 1: Get all pending transactions from mempool
    const pendingTxs = await TransactionModel.getPendingTransactions(indiaDb);
    
    if (pendingTxs.length === 0) {
      return res.status(400).json({ 
        error: 'No pending transactions to mine',
        message: 'Create some transactions first using POST /api/transactions'
      });
    }
    
    // Step 2: Get the latest block (we need its hash for the chain link)
    const latestBlock = await BlockModel.getLatestBlock(indiaDb);
    const previousHash = latestBlock ? latestBlock.current_hash : '0';
    
    // Step 3: Build Merkle tree from transaction hashes
    const txHashes = pendingTxs.map(tx => tx.hash);
    const merkleTree = buildMerkleTree(txHashes);
    const merkleRoot = merkleTree.root;
    
    // Step 4: Mine the block (Proof of Work — find valid nonce)
    const difficulty = parseInt(process.env.MINING_DIFFICULTY) || 3;
    const timestamp = new Date().toISOString();
    
    console.log(`\n⛏️  Mining block with ${pendingTxs.length} transactions (difficulty: ${difficulty})...`);
    
    const miningResult = mineBlock({
      previousHash,
      merkleRoot,
      timestamp
    }, difficulty);
    
    console.log(`✅ Block mined! Nonce: ${miningResult.nonce}, Attempts: ${miningResult.attempts}, Time: ${miningResult.miningTimeMs}ms`);
    
    // Step 5: Save the block to database
    const block = await BlockModel.createBlock(indiaDb, {
      previousHash,
      merkleRoot,
      currentHash: miningResult.hash,
      nonce: miningResult.nonce,
      difficulty,
      transactionCount: pendingTxs.length,
      minedBy: 'system'
    });
    
    // Step 6: Confirm all transactions (move out of mempool)
    const txIds = pendingTxs.map(tx => tx.transaction_id);
    await TransactionModel.confirmTransactions(indiaDb, txIds, block.block_id);
    
    // Step 7: [REMOVED] Balances are now updated instantly by transactionController
    
    // Step 8: Audit log
    await AuditLog.createAuditEntry(indiaDb, {
      eventType: 'block_mined',
      entityType: 'block',
      entityId: block.block_id,
      details: {
        nonce: miningResult.nonce,
        attempts: miningResult.attempts,
        miningTimeMs: miningResult.miningTimeMs,
        transactionCount: pendingTxs.length,
        merkleRoot: merkleRoot.substring(0, 16) + '...'
      }
    });
    
    // Step 9: Trigger replication to other regions
    let replicationResults = [];
    try {
      replicationResults = await replicateBlock('india', {
        ...block,
        previous_hash: previousHash,
        merkle_root: merkleRoot,
        current_hash: miningResult.hash,
        nonce: miningResult.nonce,
        difficulty,
        transaction_count: pendingTxs.length,
        mined_by: 'system'
      }, pendingTxs);
    } catch (repError) {
      console.log('⚠️  Replication failed (non-critical):', repError.message);
    }
    
    res.status(201).json({
      message: `Block #${block.block_id} mined successfully! ⛏️`,
      block: {
        block_id: block.block_id,
        previous_hash: previousHash,
        merkle_root: merkleRoot,
        current_hash: miningResult.hash,
        nonce: miningResult.nonce,
        difficulty,
        transaction_count: pendingTxs.length
      },
      mining: {
        attempts: miningResult.attempts,
        time_ms: miningResult.miningTimeMs,
        message: `Found valid nonce after ${miningResult.attempts} attempts in ${miningResult.miningTimeMs}ms`
      },
      merkle_tree: {
        root: merkleRoot,
        levels: merkleTree.levels.length,
        leaf_count: txHashes.length
      },
      transactions_confirmed: txIds,
      replication: replicationResults
    });
  } catch (error) {
    console.error('Error mining block:', error);
    res.status(500).json({ error: 'Failed to mine block', details: error.message });
  }
}

// GET /api/blocks — List all blocks
async function getBlocks(req, res) {
  try {
    const { getDbByRegion } = require('../config/db');
    const region = req.query.region || 'india';
    const db = getDbByRegion(region);
    
    const blocks = await BlockModel.getAllBlocks(db);
    res.json({
      count: blocks.length,
      blockchain: blocks
    });
  } catch (error) {
    console.error('Error fetching blocks:', error);
    res.status(500).json({ error: 'Failed to fetch blocks', details: error.message });
  }
}

// GET /api/blocks/:id — Get block with transactions
async function getBlock(req, res) {
  try {
    const block = await BlockModel.getBlockById(indiaDb, req.params.id);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }
    
    const transactions = await TransactionModel.getTransactionsByBlockId(indiaDb, block.block_id);
    
    res.json({
      block,
      transactions,
      transaction_count: transactions.length
    });
  } catch (error) {
    console.error('Error fetching block:', error);
    res.status(500).json({ error: 'Failed to fetch block', details: error.message });
  }
}

// GET /api/blocks/verify-chain — Verify entire blockchain integrity
async function verifyChainHandler(req, res) {
  try {
    const result = await verifyChain(indiaDb);
    res.json(result);
  } catch (error) {
    console.error('Error verifying chain:', error);
    res.status(500).json({ error: 'Failed to verify chain', details: error.message });
  }
}

module.exports = {
  mine,
  getBlocks,
  getBlock,
  verifyChainHandler
};
