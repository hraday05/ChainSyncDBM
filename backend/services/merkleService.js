// ============================================
// merkleService.js — Merkle Tree Construction
// ============================================
// WHY Merkle Trees?
// A Merkle tree efficiently summarizes many transactions into one hash.
//
// Imagine a block has 4 transactions with hashes: A, B, C, D
//
//         Merkle Root = H(H(AB) + H(CD))
//              /            \
//        H(AB)              H(CD)
//        /    \             /    \
//      H(A)  H(B)        H(C)  H(D)
//
// If someone changes transaction C:
//   → H(C) changes → H(CD) changes → Merkle Root changes
//   → We immediately know something was tampered with
//
// In a real blockchain (like Ethereum), you can prove a single
// transaction is in a block by providing just log2(N) hashes
// (called a Merkle Proof), instead of all N transactions.
// ============================================

const { generateHash } = require('./hashService');

// Build a Merkle tree from an array of transaction hashes
// Returns the Merkle root hash
function buildMerkleRoot(transactionHashes) {
  // Edge case: no transactions
  if (transactionHashes.length === 0) {
    return generateHash('empty_block');
  }
  
  // Edge case: single transaction
  if (transactionHashes.length === 1) {
    return transactionHashes[0];
  }

  let currentLevel = [...transactionHashes];
  
  // Keep hashing pairs until we have a single root
  while (currentLevel.length > 1) {
    const nextLevel = [];
    
    // Process pairs of hashes
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      // If odd number of hashes, duplicate the last one
      // (this is what Bitcoin does)
      const right = currentLevel[i + 1] || currentLevel[i];
      
      // Combine the pair and hash them together
      const combined = generateHash(left + right);
      nextLevel.push(combined);
    }
    
    currentLevel = nextLevel;
  }
  
  return currentLevel[0]; // The Merkle root
}

// Build full Merkle tree (returns all levels for visualization)
function buildMerkleTree(transactionHashes) {
  if (transactionHashes.length === 0) {
    return { root: generateHash('empty_block'), levels: [] };
  }
  
  const levels = [transactionHashes.map(h => h)]; // Level 0 = leaf hashes
  let currentLevel = [...transactionHashes];
  
  while (currentLevel.length > 1) {
    const nextLevel = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || currentLevel[i];
      nextLevel.push(generateHash(left + right));
    }
    
    levels.push(nextLevel);
    currentLevel = nextLevel;
  }
  
  return {
    root: currentLevel[0],
    levels: levels
  };
}

module.exports = {
  buildMerkleRoot,
  buildMerkleTree
};
