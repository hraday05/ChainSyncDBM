// Block Routes
const express = require('express');
const router = express.Router();
const { mine, getBlocks, getBlock, verifyChainHandler } = require('../controllers/blockController');

router.post('/mine', mine);                // POST /api/blocks/mine
router.get('/', getBlocks);                // GET  /api/blocks
router.get('/verify-chain', verifyChainHandler); // GET  /api/blocks/verify-chain
router.get('/:id', getBlock);              // GET  /api/blocks/:id

module.exports = router;
