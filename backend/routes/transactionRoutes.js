// Transaction Routes
const express = require('express');
const router = express.Router();
const { 
  addTransaction, 
  getTransactions, 
  getTransaction, 
  verifyTransactionHandler,
  getStats 
} = require('../controllers/transactionController');

router.post('/', addTransaction);                // POST /api/transactions
router.get('/', getTransactions);                 // GET  /api/transactions  (?status=pending)
router.get('/stats', getStats);                   // GET  /api/transactions/stats
router.get('/:id', getTransaction);               // GET  /api/transactions/:id
router.get('/:id/verify', verifyTransactionHandler); // GET  /api/transactions/:id/verify

module.exports = router;
