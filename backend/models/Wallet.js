// ============================================
// Wallet.js — Database queries for wallets
// ============================================
// Each wallet represents a user in our blockchain.
// It stores their RSA key pair (for digital signatures)
// and their current balance.
// ============================================

// Create a new wallet
async function createWallet(db, { username, publicKey, privateKey, balance = 1000.00 }) {
  const sql = `
    INSERT INTO wallets (username, public_key, private_key, balance)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await db.execute(sql, [username, publicKey, privateKey, balance]);
  return { wallet_id: result.insertId, username, balance };
}

// Find wallet by username
async function getWalletByUsername(db, username) {
  const sql = `SELECT * FROM wallets WHERE username = ?`;
  const [rows] = await db.execute(sql, [username]);
  return rows[0] || null;
}

// Get all wallets (without private keys for safety)
async function getAllWallets(db) {
  const sql = `SELECT wallet_id, username, public_key, balance, created_at FROM wallets`;
  const [rows] = await db.execute(sql);
  return rows;
}

// Update wallet balance
async function updateBalance(db, username, newBalance) {
  const sql = `UPDATE wallets SET balance = ? WHERE username = ?`;
  const [result] = await db.execute(sql, [newBalance, username]);
  return result.affectedRows > 0;
}

// Check if wallet exists
async function walletExists(db, username) {
  const sql = `SELECT COUNT(*) as count FROM wallets WHERE username = ?`;
  const [rows] = await db.execute(sql, [username]);
  return rows[0].count > 0;
}

module.exports = {
  createWallet,
  getWalletByUsername,
  getAllWallets,
  updateBalance,
  walletExists
};
