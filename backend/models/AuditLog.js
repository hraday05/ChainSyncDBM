// ============================================
// AuditLog.js — System event tracking
// ============================================

async function createAuditEntry(db, { eventType, entityType, entityId, details, region }) {
  const sql = `
    INSERT INTO audit_log (event_type, entity_type, entity_id, details, region)
    VALUES (?, ?, ?, ?, ?)
  `;
  const detailsJson = JSON.stringify(details || {});
  const [result] = await db.execute(sql, [eventType, entityType || null, entityId || null, detailsJson, region || 'india']);
  return { audit_id: result.insertId };
}

async function getAuditLogs(db, eventType = null, limit = 50) {
  let sql = `SELECT * FROM audit_log`;
  let params = [];
  
  if (eventType) {
    sql += ` WHERE event_type = ?`;
    params.push(eventType);
  }
  
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  
  const [rows] = await db.execute(sql, params);
  // Parse JSON details field
  return rows.map(row => ({
    ...row,
    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
  }));
}

module.exports = {
  createAuditEntry,
  getAuditLogs
};
