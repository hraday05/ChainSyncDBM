const express = require('express');
const router = express.Router();
const { getAllRegionContent, getRegionTable, tamperData } = require('../controllers/databaseController');

// GET /api/database/all — all regions, all tables
router.get('/all', getAllRegionContent);

// GET /api/database/:region/:table — specific table content
router.get('/:region/:table', getRegionTable);

// POST /api/database/tamper - simulate cyber attack
router.post('/tamper', tamperData);

module.exports = router;
