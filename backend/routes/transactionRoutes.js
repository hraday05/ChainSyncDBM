const express = require('express');
const router = express.Router();
const { createTransaction, verifyTransaction } = require('../controllers/transactionController');

router.post('/transaction', createTransaction);
router.post('/verify', verifyTransaction);

module.exports = router;

