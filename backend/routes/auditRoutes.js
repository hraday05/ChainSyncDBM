// Audit Routes
const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/auditController');

router.get('/', getLogs);   // GET /api/audit  (?event_type=block_mined&limit=20)

module.exports = router;
