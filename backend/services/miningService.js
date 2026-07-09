// ============================================
// miningService.js — Proof of Work Mining
// ============================================
// WHY Proof of Work?
// In real blockchains, creating a block must be HARD.
// This prevents spam and makes tampering expensive.
//
// How it works:
//   1. Take the block header data (previous_hash + merkle_root + timestamp)
//   2. Add a number called "nonce" (starts at 0)
//   3. Hash everything: SHA256(header + nonce)
//   4. Check: does the hash start with N zeros? (N = difficulty)
//      - If YES → Block is mined! The nonce is the solution.
//      - If NO  → Increment nonce, try again.
//
// With difficulty=3, the hash must start with "000"
//   This takes ~100-1000 attempts (fast for demo)
// With difficulty=6, the hash must start with "000000"
//   This takes ~1,000,000 attempts (like real mining)
//
// Bitcoin's difficulty is so high it takes billions of attempts!
// ============================================

const { generateHash } = require('./hashService');

// Mine a block: find a nonce that produces a hash with leading zeros
function mineBlock(blockData, difficulty = 3) {
  const target = '0'.repeat(difficulty);  // e.g., "000" for difficulty 3
  let nonce = 0;
  let hash = '';
  const startTime = Date.now();
  
  // Keep trying nonces until we find a valid hash
  while (true) {
    // Combine block data with current nonce
    const data = `${blockData.previousHash}${blockData.merkleRoot}${nonce}${blockData.timestamp}`;
    hash = generateHash(data);
    
    // Check if hash starts with enough zeros
    if (hash.startsWith(target)) {
      const endTime = Date.now();
      return {
        nonce: nonce,
        hash: hash,
        attempts: nonce + 1,
        miningTimeMs: endTime - startTime
      };
    }
    
    nonce++;
    
    // Safety: prevent infinite loops (shouldn't happen with difficulty 3)
    if (nonce > 10000000) {
      throw new Error('Mining failed: exceeded maximum attempts');
    }
  }
}

module.exports = {
  mineBlock
};
