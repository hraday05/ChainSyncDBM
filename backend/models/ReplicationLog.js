// ============================================
// ReplicationLog.js — Tracks cross-region sync
// ============================================

async function createLog(db, { transactionId, blockId, sourceRegion, targetRegion, status }) {
  const sql = `
    INSERT INTO replication_log (transaction_id, block_id, source_region, target_region, status)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result] = await db.execute(sql, [transactionId || null, blockId || null, sourceRegion, targetRegion, status || 'pending']);
  return { log_id: result.insertId };
}

async function updateLogStatus(db, logId, status, errorMessage = null) {
  const sql = `
    UPDATE replication_log 
    SET status = ?, error_message = ?, synced_at = ${status === 'synced' ? 'NOW()' : 'NULL'}
    WHERE log_id = ?
  `;
  await db.execute(sql, [status, errorMessage, logId]);
}

async function getAllLogs(db) {
  const sql = `SELECT * FROM replication_log ORDER BY created_at DESC`;
  const [rows] = await db.execute(sql);
  return rows;
}

async function getLogsByStatus(db, status) {
  const sql = `SELECT * FROM replication_log WHERE status = ? ORDER BY created_at DESC`;
  const [rows] = await db.execute(sql, [status]);
  return rows;
}

module.exports = {
  createLog,
  updateLogStatus,
  getAllLogs,
  getLogsByStatus
};
