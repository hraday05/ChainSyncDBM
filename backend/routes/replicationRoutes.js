// Replication Routes
const express = require('express');
const router = express.Router();
const { syncAll, getStatus, compare } = require('../controllers/replicationController');

router.post('/sync', syncAll);       // POST /api/replication/sync
router.get('/status', getStatus);    // GET  /api/replication/status
router.get('/compare', compare);     // GET  /api/replication/compare

module.exports = router;
