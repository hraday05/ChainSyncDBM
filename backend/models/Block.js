// ============================================
// Block.js — Database queries for blocks
// ============================================
// Blocks group transactions together. Each block has:
//   - previous_hash (link to previous block = the "chain")
//   - merkle_root (single hash summarizing all transactions)
//   - current_hash (hash of the entire block header)
//   - nonce (the Proof of Work solution)
// ============================================

// Create a new block
async function createBlock(db, { previousHash, merkleRoot, currentHash, nonce, difficulty, transactionCount, minedBy }) {
  const sql = `
    INSERT INTO blocks (previous_hash, merkle_root, current_hash, nonce, difficulty, transaction_count, mined_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await db.execute(sql, [previousHash, merkleRoot, currentHash, nonce, difficulty || 3, transactionCount, minedBy || 'system']);
  return { block_id: result.insertId, previousHash, merkleRoot, currentHash, nonce };
}

// Get the latest block (needed to get previous_hash for new block)
async function getLatestBlock(db) {
  const sql = `SELECT * FROM blocks ORDER BY block_id DESC LIMIT 1`;
  const [rows] = await db.execute(sql);
  return rows[0] || null;
}

// Get all blocks (the blockchain)
async function getAllBlocks(db) {
  const sql = `SELECT * FROM blocks ORDER BY block_id ASC`;
  const [rows] = await db.execute(sql);
  return rows;
}

// Get a specific block by ID
async function getBlockById(db, id) {
  const sql = `SELECT * FROM blocks WHERE block_id = ?`;
  const [rows] = await db.execute(sql, [id]);
  return rows[0] || null;
}

// Count total blocks
async function getBlockCount(db) {
  const sql = `SELECT COUNT(*) as count FROM blocks`;
  const [rows] = await db.execute(sql);
  return rows[0].count;
}

module.exports = {
  createBlock,
  getLatestBlock,
  getAllBlocks,
  getBlockById,
  getBlockCount
};
