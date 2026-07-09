// ============================================
// verificationService.js — Integrity Checking
// ============================================
// This service answers: "Has anyone tampered with the data?"
//
// Three types of verification:
//   1. Transaction verification: Is the hash still valid?
//   2. Signature verification: Did the sender really sign this?
//   3. Chain verification: Is the entire blockchain intact?
//
// If ANYONE changes even 1 byte in the database,
// verification will FAIL — this is the power of hashing.
// ============================================

const { generateHash } = require('./hashService');
const { verifySignature, getTransactionSignData } = require('./cryptoService');
const { buildMerkleRoot } = require('./merkleService');
const TransactionModel = require('../models/Transaction');
const BlockModel = require('../models/Block');
const WalletModel = require('../models/Wallet');

// Verify a single transaction's integrity
async function verifyTransaction(db, transactionId) {
  const tx = await TransactionModel.getTransactionById(db, transactionId);
  if (!tx) {
    return { valid: false, message: 'Transaction not found' };
  }
  
  const checks = {};
  
  // Check 1: Verify the hash
  const originalData = `${tx.sender}${tx.receiver}${tx.amount}${tx.created_at.toISOString()}`;
  const recalculatedHash = generateHash(originalData);
  checks.hash = {
    valid: recalculatedHash === tx.hash,
    stored: tx.hash,
    recalculated: recalculatedHash
  };
  
  // Check 2: Verify the digital signature
  if (tx.signature) {
    const senderWallet = await WalletModel.getWalletByUsername(db, tx.sender);
    if (senderWallet) {
      const signData = getTransactionSignData(tx);
      checks.signature = {
        valid: verifySignature(signData, tx.signature, senderWallet.public_key),
        message: 'Verified against sender\'s public key'
      };
    } else {
      checks.signature = { valid: false, message: 'Sender wallet not found' };
    }
  }
  
  // Overall result
  const allValid = Object.values(checks).every(c => c.valid);
  
  return {
    valid: allValid,
    transaction_id: transactionId,
    checks,
    message: allValid ? 'Transaction integrity verified ✅' : 'TAMPER DETECTED ❌'
  };
}

// Verify the entire blockchain
async function verifyChain(db) {
  const blocks = await BlockModel.getAllBlocks(db);
  
  if (blocks.length === 0) {
    return { valid: true, message: 'No blocks to verify', blocksChecked: 0 };
  }
  
  const invalidBlocks = [];
  
  for (let i = 1; i < blocks.length; i++) {  // Start from 1 (skip genesis)
    const currentBlock = blocks[i];
    const previousBlock = blocks[i - 1];
    
    // Check 1: Does this block's previous_hash match the previous block's current_hash?
    if (currentBlock.previous_hash !== previousBlock.current_hash) {
      invalidBlocks.push({
        block_id: currentBlock.block_id,
        error: 'Chain link broken',
        expected_previous_hash: previousBlock.current_hash,
        actual_previous_hash: currentBlock.previous_hash
      });
      continue;
    }
    
    // Check 2: Verify Merkle root
    const blockTransactions = await TransactionModel.getTransactionsByBlockId(db, currentBlock.block_id);
    if (blockTransactions.length > 0) {
      const txHashes = blockTransactions.map(tx => tx.hash);
      const recalculatedMerkle = buildMerkleRoot(txHashes);
      
      if (recalculatedMerkle !== currentBlock.merkle_root) {
        invalidBlocks.push({
          block_id: currentBlock.block_id,
          error: 'Merkle root mismatch (transactions may have been tampered)',
          expected: recalculatedMerkle,
          actual: currentBlock.merkle_root
        });
        continue;
      }
    }
    
    // Check 3: Verify Proof of Work (hash starts with correct number of zeros)
    const target = '0'.repeat(currentBlock.difficulty);
    if (!currentBlock.current_hash.startsWith(target)) {
      invalidBlocks.push({
        block_id: currentBlock.block_id,
        error: 'Proof of Work invalid',
        hash: currentBlock.current_hash,
        required_prefix: target
      });
    }
  }
  
  const valid = invalidBlocks.length === 0;
  
  return {
    valid,
    blocksChecked: blocks.length,
    invalidBlocks,
    message: valid 
      ? `Blockchain integrity verified ✅ (${blocks.length} blocks checked)` 
      : `TAMPER DETECTED ❌ (${invalidBlocks.length} invalid blocks found)`
  };
}

module.exports = {
  verifyTransaction,
  verifyChain
};
