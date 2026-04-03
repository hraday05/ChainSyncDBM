const express = require('express');
const router = express.Router();
const { createTransaction, verifyTransaction } = require('../controllers/transactionController');

router.post('/', createTransaction);
router.post('/verify', verifyTransaction);

module.exports = router;

