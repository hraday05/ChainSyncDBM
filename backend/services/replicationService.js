// ============================================
// replicationService.js — Cross-Region Data Sync
// ============================================
// WHY replication?
// In a real distributed system, data is stored across multiple
// geographic locations. If one server goes down, others have copies.
//
// Our flow:
//   1. Transaction created in India (primary region)
//   2. After mining, we REPLICATE the block + transactions to US and EU
//   3. We log every replication attempt (success/failure)
//   4. We can COMPARE regions to check consistency
// ============================================

const { getDbByRegion } = require('../config/db');
const TransactionModel = require('../models/Transaction');
const BlockModel = require('../models/Block');
const WalletModel = require('../models/Wallet');
const ReplicationLog = require('../models/ReplicationLog');
const AuditLog = require('../models/AuditLog');

const ALL_REGIONS = ['india', 'us', 'eu'];

// Simulated latency helper functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function getSimulatedDelay(targetRegion) {
  if (targetRegion === 'us') return 250; // 250ms to reach US Datacenter
  if (targetRegion === 'eu') return 150; // 150ms to reach EU Datacenter
  return 100;
}

// Replicate a single transaction to target regions
async function replicateTransaction(sourceRegion, transaction, targetRegions = null) {
  const targets = targetRegions || ALL_REGIONS.filter(r => r !== sourceRegion);
  const results = [];
  const sourceDb = getDbByRegion(sourceRegion);
  
  for (const target of targets) {
    const delayMs = getSimulatedDelay(target);
    await sleep(delayMs);

    const logEntry = await ReplicationLog.createLog(sourceDb, {
      transactionId: transaction.transaction_id,
      sourceRegion,
      targetRegion: target,
      status: 'pending'
    });
    
    try {
      const targetDb = getDbByRegion(target);
      
      // Insert the transaction into the target region
      await TransactionModel.createTransaction(targetDb, {
        sender: transaction.sender,
        receiver: transaction.receiver,
        amount: transaction.amount,
        transactionType: transaction.transaction_type,
        hash: transaction.hash,
        signature: transaction.signature,
        created_at: transaction.created_at
      });
      
      // Mark replication as successful
      await ReplicationLog.updateLogStatus(sourceDb, logEntry.log_id, 'synced');
      results.push({ region: target, status: 'synced' });
      
    } catch (error) {
      // Mark replication as failed
      await ReplicationLog.updateLogStatus(sourceDb, logEntry.log_id, 'failed', error.message);
      results.push({ region: target, status: 'failed', error: error.message });
    }
  }
  
  return results;
}

// Replicate a block and all its transactions
async function replicateBlock(sourceRegion, block, transactions) {
  const targets = ALL_REGIONS.filter(r => r !== sourceRegion);
  const sourceDb = getDbByRegion(sourceRegion);
  const results = [];
  
  for (const target of targets) {
    const delayMs = getSimulatedDelay(target);
    await sleep(delayMs);

    const logEntry = await ReplicationLog.createLog(sourceDb, {
      blockId: block.block_id,
      sourceRegion,
      targetRegion: target,
      status: 'pending'
    });
    
    try {
      const targetDb = getDbByRegion(target);
      
      // Insert block into target
      const newBlock = await BlockModel.createBlock(targetDb, {
        previousHash: block.previous_hash,
        merkleRoot: block.merkle_root,
        currentHash: block.current_hash,
        nonce: block.nonce,
        difficulty: block.difficulty,
        transactionCount: block.transaction_count,
        minedBy: block.mined_by
      });
      
      // Insert all transactions into target
      for (const tx of transactions) {
        const newTx = await TransactionModel.createTransaction(targetDb, {
          sender: tx.sender,
          receiver: tx.receiver,
          amount: tx.amount,
          transactionType: tx.transaction_type,
          hash: tx.hash,
          signature: tx.signature,
          created_at: tx.created_at
        });
        
        // Confirm the transaction in target DB
        await TransactionModel.confirmTransactions(targetDb, [newTx.transaction_id], newBlock.block_id);
      }
      
      // Replicate wallets too (sync balances)
      await replicateWallets(sourceRegion, target);
      
      await ReplicationLog.updateLogStatus(sourceDb, logEntry.log_id, 'synced');
      results.push({ region: target, status: 'synced', blockId: newBlock.block_id });
      
    } catch (error) {
      await ReplicationLog.updateLogStatus(sourceDb, logEntry.log_id, 'failed', error.message);
      results.push({ region: target, status: 'failed', error: error.message });
    }
  }
  
  // Audit log
  await AuditLog.createAuditEntry(sourceDb, {
    eventType: 'replication_completed',
    entityType: 'block',
    entityId: block.block_id,
    details: { results },
    region: sourceRegion
  });
  
  return results;
}

// Sync wallet balances to target regions
async function replicateWallets(sourceRegion, targetRegion) {
  const sourceDb = getDbByRegion(sourceRegion);
  const targetDb = getDbByRegion(targetRegion);
  
  const wallets = await WalletModel.getAllWallets(sourceDb);
  
  for (const wallet of wallets) {
    const sourceWallet = await WalletModel.getWalletByUsername(sourceDb, wallet.username);
    const existingWallet = await WalletModel.getWalletByUsername(targetDb, wallet.username);
    
    if (existingWallet) {
      // Update balance
      await WalletModel.updateBalance(targetDb, wallet.username, sourceWallet.balance);
    } else {
      // Create wallet in target
      await WalletModel.createWallet(targetDb, {
        username: sourceWallet.username,
        publicKey: sourceWallet.public_key,
        privateKey: sourceWallet.private_key,
        balance: sourceWallet.balance
      });
    }
  }
}

// Compare data across all regions (consistency check)
async function compareRegions() {
  const comparison = {};
  
  for (const region of ALL_REGIONS) {
    try {
      const db = getDbByRegion(region);
      
      const [blockCount] = await db.execute('SELECT COUNT(*) as count FROM blocks');
      const [txCount] = await db.execute('SELECT COUNT(*) as count FROM transactions');
      const [walletCount] = await db.execute('SELECT COUNT(*) as count FROM wallets');
      const [confirmedCount] = await db.execute("SELECT COUNT(*) as count FROM transactions WHERE status = 'confirmed'");
      
      // BFT: Fetch all block hashes to compare the chain topology.
      // We SKIP the genesis block (block_id = 1) because each region seeds
      // genesis independently with a different local hash string. Only
      // replicated blocks (block_id > 1) must be identical across regions.
      const [blocks] = await db.execute('SELECT block_id, current_hash FROM blocks ORDER BY block_id ASC');
      const replicatedBlocks = blocks.filter(b => b.block_id !== 1);
      const chainFingerprint = replicatedBlocks.map(b => b.current_hash).join('|');

      comparison[region] = {
        online: true,
        blocks: blockCount[0].count,
        transactions: txCount[0].count,
        wallets: walletCount[0].count,
        confirmedTransactions: confirmedCount[0].count,
        chainFingerprint: chainFingerprint
      };
    } catch (error) {
      comparison[region] = {
        online: false,
        error: error.message
      };
    }
  }
  
  // Check if all online regions have same counts AND same full-chain fingerprint
  const onlineRegions = Object.entries(comparison).filter(([_, v]) => v.online);
  let consistent = false;
  
  if (onlineRegions.length > 1) {
    consistent = onlineRegions.every(([_, v]) => v.blocks === onlineRegions[0][1].blocks) &&
                 onlineRegions.every(([_, v]) => v.chainFingerprint === onlineRegions[0][1].chainFingerprint);
                 
    // Clean up fingerprint from output so it doesn't flood the UI, instead provide a neat validation string
    const referenceFingerprint = onlineRegions[0][1].chainFingerprint;
    for (const [reg, data] of onlineRegions) {
       data.chain_integrity = (data.chainFingerprint === referenceFingerprint) ? "Valid 🔐" : "Corrupted ❌";
       delete data.chainFingerprint; 
    }
  }
  
  return {
    consistent,
    regions: comparison,
    message: consistent 
      ? 'All regions are in sync ✅ (Full Chain Integrity Verified)' 
      : 'Regions are out of sync ⚠️ (Byzantine Fault Detected!)'
  };
}

module.exports = {
  replicateTransaction,
  replicateBlock,
  replicateWallets,
  compareRegions,
  ALL_REGIONS
};
