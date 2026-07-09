// ============================================
// databaseController.js — DB Content Explorer
// Returns live table data from all 3 regions
// ============================================

const { indiaDb, usDb, euDb, getDbByRegion } = require('../config/db');

const DB_MAP = { india: indiaDb, us: usDb, eu: euDb };

async function safeQuery(pool, sql) {
  try {
    const [rows] = await pool.query(sql);
    return { ok: true, rows };
  } catch (err) {
    return { ok: false, error: err.message, rows: [] };
  }
}

// SIMULATE CYBER ATTACK (For Demonstration)
async function tamperData(req, res) {
  try {
    const db = getDbByRegion('us'); // We will simulate tampering the US Replica
    
    // Maliciously alter the most recent transaction's amount directly in the database
    // This bypasses the cryptoService, meaning the signature and hash will be broken!
    const [result] = await db.execute("UPDATE transactions SET amount = 999999.00 ORDER BY transaction_id DESC LIMIT 1");
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'No transactions exist yet to tamper with!' });
    }
    
    // ALSO tamper with the latest block's hash so the Topology Monitor instantly catches the replica divergence
    await db.execute("UPDATE blocks SET current_hash = CONCAT(current_hash, '-TAMPERED') ORDER BY block_id DESC LIMIT 1");
    
    res.json({ message: '🚨 Database Breached! Rogue edit applied to US Datacenter!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/database/all — returns wallets, transactions, blocks from all 3 regions
async function getAllRegionContent(req, res) {
  const regions = ['india', 'us', 'eu'];
  const result = {};

  for (const region of regions) {
    const pool = DB_MAP[region];

    const [wallets, transactions, blocks, repLog] = await Promise.all([
      safeQuery(pool, 'SELECT wallet_id, username, balance, created_at FROM wallets ORDER BY created_at DESC LIMIT 50'),
      safeQuery(pool, 'SELECT transaction_id, sender, receiver, amount, status, block_id, LEFT(hash,24) AS hash, created_at FROM transactions ORDER BY created_at DESC LIMIT 50'),
      safeQuery(pool, 'SELECT block_id, LEFT(current_hash,24) AS current_hash, LEFT(previous_hash,24) AS previous_hash, merkle_root, nonce, transaction_count, mined_by, created_at FROM blocks ORDER BY block_id DESC LIMIT 50'),
      safeQuery(pool, 'SELECT log_id, transaction_id, block_id, source_region, target_region, status, retry_count, created_at FROM replication_log ORDER BY created_at DESC LIMIT 30')
    ]);

    result[region] = {
      wallets: { ok: wallets.ok, error: wallets.error, data: wallets.rows },
      transactions: { ok: transactions.ok, error: transactions.error, data: transactions.rows },
      blocks: { ok: blocks.ok, error: blocks.error, data: blocks.rows },
      replication_log: { ok: repLog.ok, error: repLog.error, data: repLog.rows }
    };
  }

  res.json({ regions: result });
}

// GET /api/database/:region/:table — single region, single table
async function getRegionTable(req, res) {
  const { region, table } = req.params;
  const allowed = ['wallets', 'transactions', 'blocks', 'replication_log', 'audit_log'];
  if (!DB_MAP[region]) return res.status(400).json({ error: 'Unknown region' });
  if (!allowed.includes(table)) return res.status(400).json({ error: 'Unknown table' });

  const pool = DB_MAP[region];
  const result = await safeQuery(pool, `SELECT * FROM ${table} ORDER BY 1 DESC LIMIT 100`);
  if (!result.ok) return res.status(500).json({ error: result.error });
  res.json({ region, table, count: result.rows.length, data: result.rows });
}

module.exports = { getAllRegionContent, getRegionTable, tamperData };
