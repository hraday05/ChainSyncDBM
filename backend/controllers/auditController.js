// ============================================
// auditController.js — Audit Log API Handlers
// ============================================

const { indiaDb } = require('../config/db');
const AuditLog = require('../models/AuditLog');

// GET /api/audit — Get audit logs
async function getLogs(req, res) {
  try {
    const { event_type, limit } = req.query;
    const logs = await AuditLog.getAuditLogs(indiaDb, event_type, parseInt(limit) || 50);
    
    res.json({
      count: logs.length,
      filter: event_type || 'all',
      logs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs', details: error.message });
  }
}

module.exports = {
  getLogs
};
