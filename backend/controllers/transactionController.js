// ============================================
// transactionController.js — Transaction API Handlers
// ============================================

const { indiaDb } = require('../config/db');
const TransactionModel = require('../models/Transaction');
const WalletModel = require('../models/Wallet');
const AuditLog = require('../models/AuditLog');
const { hashTransaction } = require('../services/hashService');
const { signData, getTransactionSignData } = require('../services/cryptoService');
const { verifyTransaction } = require('../services/verificationService');

// POST /api/transactions — Create a new transaction (goes to mempool)
async function addTransaction(req, res) {
  try {
    const { sender, receiver, amount, transaction_type } = req.body;
    
    // ---- VALIDATION ----
    if (!sender || !receiver || !amount) {
      return res.status(400).json({ error: 'sender, receiver, and amount are required' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }
    
    if (sender === receiver) {
      return res.status(400).json({ error: 'Sender and receiver cannot be the same' });
    }
    
    // Check sender wallet exists
    const senderWallet = await WalletModel.getWalletByUsername(indiaDb, sender);
    if (!senderWallet) {
      return res.status(404).json({ error: `Sender wallet '${sender}' not found. Create a wallet first.` });
    }
    
    // Check receiver wallet exists
    const receiverWallet = await WalletModel.getWalletByUsername(indiaDb, receiver);
    if (!receiverWallet) {
      return res.status(404).json({ error: `Receiver wallet '${receiver}' not found. Create a wallet first.` });
    }
    
    // Check sender has enough balance
    if (parseFloat(senderWallet.balance) < parseFloat(amount)) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        current_balance: senderWallet.balance,
        requested_amount: amount
      });
    }
    
    // ---- HASH THE TRANSACTION ----
    // Remove milliseconds to perfectly match MySQL DATETIME precision
    const sqlDate = new Date();
    sqlDate.setMilliseconds(0);
    const timestamp = sqlDate.toISOString();
    
    const hash = hashTransaction({ sender, receiver, amount, timestamp });
    
    // ---- SIGN THE TRANSACTION ----
    // The sender's private key signs the transaction data
    // This proves the sender authorized this transaction
    const signableData = getTransactionSignData({ sender, receiver, amount });
    const signature = signData(signableData, senderWallet.private_key);
    
    // ---- SAVE TO DATABASE (status = 'pending' = in mempool) ----
    const transaction = await TransactionModel.createTransaction(indiaDb, {
      sender,
      receiver,
      amount: parseFloat(amount),
      transactionType: transaction_type || 'transfer',
      hash,
      signature,
      created_at: sqlDate
    });
    
    // ---- INSTANT BALANCE SUBTRACTION ----
    await WalletModel.updateBalance(indiaDb, sender, parseFloat(senderWallet.balance) - parseFloat(amount));
    await WalletModel.updateBalance(indiaDb, receiver, parseFloat(receiverWallet.balance) + parseFloat(amount));

    // Audit log
    await AuditLog.createAuditEntry(indiaDb, {
      eventType: 'transaction_created',
      entityType: 'transaction',
      entityId: transaction.transaction_id,
      details: { sender, receiver, amount, hash: hash.substring(0, 16) + '...' }
    });
    
    res.status(201).json({
      message: 'Transaction created and balances updated instantly',
      transaction: {
        ...transaction,
        signature: signature.substring(0, 40) + '...',
        note: 'Auto-mining will process via the orchestration pipeline.'
      }
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction', details: error.message });
  }
}

// GET /api/transactions — List all transactions
async function getTransactions(req, res) {
  try {
    const { status } = req.query; // Optional filter: ?status=pending
    const transactions = await TransactionModel.getAllTransactions(indiaDb, status);
    
    res.json({
      count: transactions.length,
      filter: status || 'all',
      transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', details: error.message });
  }
}

// GET /api/transactions/:id — Get single transaction
async function getTransaction(req, res) {
  try {
    const transaction = await TransactionModel.getTransactionById(indiaDb, req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ transaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction', details: error.message });
  }
}

// GET /api/transactions/:id/verify — Verify transaction integrity
async function verifyTransactionHandler(req, res) {
  try {
    const result = await verifyTransaction(indiaDb, parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Error verifying transaction:', error);
    res.status(500).json({ error: 'Failed to verify transaction', details: error.message });
  }
}

// GET /api/transactions/stats — Transaction statistics
async function getStats(req, res) {
  try {
    const stats = await TransactionModel.countByStatus(indiaDb);
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
}

module.exports = {
  addTransaction,
  getTransactions,
  getTransaction,
  verifyTransactionHandler,
  getStats
};
