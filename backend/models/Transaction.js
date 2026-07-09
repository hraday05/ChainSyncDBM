// ============================================
// Transaction.js — Database queries for transactions
// ============================================
// Transactions are the core unit of our blockchain.
// They go through these states:
//   pending → confirmed (after mining) or failed
// ============================================

// Create a new transaction (initially in mempool as 'pending')
async function createTransaction(db, { sender, receiver, amount, transactionType, hash, signature, created_at }) {
  const sql = `
    INSERT INTO transactions (sender, receiver, amount, transaction_type, hash, signature, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `;
  const [result] = await db.execute(sql, [sender, receiver, amount, transactionType || 'transfer', hash, signature, created_at || new Date()]);
  return { transaction_id: result.insertId, sender, receiver, amount, hash, status: 'pending' };
}

// Get all transactions (with optional status filter)
async function getAllTransactions(db, status = null) {
  let sql = `SELECT * FROM transactions`;
  let params = [];
  
  if (status) {
    sql += ` WHERE status = ?`;
    params.push(status);
  }
  
  sql += ` ORDER BY created_at DESC`;
  const [rows] = await db.execute(sql, params);
  return rows;
}

// Get a single transaction by ID
async function getTransactionById(db, id) {
  const sql = `SELECT * FROM transactions WHERE transaction_id = ?`;
  const [rows] = await db.execute(sql, [id]);
  return rows[0] || null;
}

// Get all pending transactions (the mempool)
async function getPendingTransactions(db) {
  const sql = `SELECT * FROM transactions WHERE status = 'pending' ORDER BY created_at ASC`;
  const [rows] = await db.execute(sql);
  return rows;
}

// Confirm transactions (called when they're mined into a block)
async function confirmTransactions(db, transactionIds, blockId) {
  if (transactionIds.length === 0) return;
  
  const placeholders = transactionIds.map(() => '?').join(',');
  const sql = `
    UPDATE transactions 
    SET status = 'confirmed', block_id = ?
    WHERE transaction_id IN (${placeholders})
  `;
  const params = [blockId, ...transactionIds];
  const [result] = await db.execute(sql, params);
  return result.affectedRows;
}

// Get transactions by block ID
async function getTransactionsByBlockId(db, blockId) {
  const sql = `SELECT * FROM transactions WHERE block_id = ?`;
  const [rows] = await db.execute(sql, [blockId]);
  return rows;
}

// Count transactions by status
async function countByStatus(db) {
  const sql = `
    SELECT status, COUNT(*) as count 
    FROM transactions 
    GROUP BY status
  `;
  const [rows] = await db.execute(sql);
  return rows;
}

module.exports = {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  getPendingTransactions,
  confirmTransactions,
  getTransactionsByBlockId,
  countByStatus
};
