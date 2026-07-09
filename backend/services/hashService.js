// ============================================
// hashService.js — SHA-256 Hashing
// ============================================
// WHY SHA-256?
// It's a one-way function: you can turn data INTO a hash,
// but you can NEVER reverse a hash back to data.
// Even changing 1 character produces a COMPLETELY different hash.
// This is how blockchain detects tampering.
//
// Example:
//   SHA256("Alice sends 500 to Bob") → "a3f2b9c8e1..."
//   SHA256("Alice sends 501 to Bob") → "7d4e1f2a8b..."  (totally different!)
// ============================================

const crypto = require('crypto');

// Generate SHA-256 hash from any data string
function generateHash(data) {
  return crypto
    .createHash('sha256')       // Use SHA-256 algorithm
    .update(data)               // Feed in the data
    .digest('hex');             // Output as hexadecimal string (64 chars)
}

// Generate hash for a transaction
// We combine all fields into one string, then hash it
function hashTransaction(transaction) {
  const data = `${transaction.sender}${transaction.receiver}${transaction.amount}${transaction.timestamp || new Date().toISOString()}`;
  return generateHash(data);
}

// Generate hash for a block header
// This includes the previous hash, merkle root, nonce, and timestamp
function hashBlock(blockData) {
  const data = `${blockData.previousHash}${blockData.merkleRoot}${blockData.nonce}${blockData.timestamp || new Date().toISOString()}`;
  return generateHash(data);
}

// Verify: recalculate hash and compare with stored hash
function verifyHash(data, expectedHash) {
  const calculatedHash = generateHash(data);
  return calculatedHash === expectedHash;
}

module.exports = {
  generateHash,
  hashTransaction,
  hashBlock,
  verifyHash
};
