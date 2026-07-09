// ============================================
// walletController.js — Wallet API Handlers
// ============================================

const { indiaDb } = require('../config/db');
const WalletModel = require('../models/Wallet');
const AuditLog = require('../models/AuditLog');
const { generateKeyPair } = require('../services/cryptoService');

// POST /api/wallets — Create a new wallet
async function createWallet(req, res) {
  try {
    const { username, initialBalance } = req.body;
    
    // Validate input
    if (!username || username.trim() === '') {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const startingBalance = initialBalance !== undefined && !isNaN(parseFloat(initialBalance)) 
      ? parseFloat(initialBalance) 
      : 1000.00;
    
    // Check if wallet already exists
    const exists = await WalletModel.walletExists(indiaDb, username);
    if (exists) {
      return res.status(409).json({ error: `Wallet for '${username}' already exists` });
    }
    
    // Generate RSA key pair
    const { publicKey, privateKey } = generateKeyPair();
    
    // Create wallet with default balance of 1000
    const wallet = await WalletModel.createWallet(indiaDb, {
      username,
      publicKey,
      privateKey,
      balance: startingBalance
    });
    
    // Audit log
    await AuditLog.createAuditEntry(indiaDb, {
      eventType: 'wallet_created',
      entityType: 'wallet',
      entityId: wallet.wallet_id,
      details: { username, initialBalance: startingBalance }
    });
    
    res.status(201).json({
      message: 'Wallet created successfully',
      wallet: {
        wallet_id: wallet.wallet_id,
        username: wallet.username,
        balance: wallet.balance,
        public_key: publicKey.substring(0, 80) + '...',  // Truncate for readability
        note: 'Full keys stored securely. RSA-2048 key pair generated.'
      }
    });
  } catch (error) {
    console.error('Error creating wallet:', error);
    res.status(500).json({ error: 'Failed to create wallet', details: error.message });
  }
}

// GET /api/wallets — List all wallets
async function getWallets(req, res) {
  try {
    const wallets = await WalletModel.getAllWallets(indiaDb);
    res.json({
      count: wallets.length,
      wallets: wallets.map(w => ({
        ...w,
        public_key: w.public_key ? w.public_key.substring(0, 80) + '...' : null
      }))
    });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({ error: 'Failed to fetch wallets', details: error.message });
  }
}

// GET /api/wallets/:username — Get wallet details
async function getWallet(req, res) {
  try {
    const wallet = await WalletModel.getWalletByUsername(indiaDb, req.params.username);
    if (!wallet) {
      return res.status(404).json({ error: `Wallet '${req.params.username}' not found` });
    }
    
    res.json({
      wallet_id: wallet.wallet_id,
      username: wallet.username,
      balance: wallet.balance,
      public_key: wallet.public_key.substring(0, 80) + '...',
      created_at: wallet.created_at
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: 'Failed to fetch wallet', details: error.message });
  }
}

module.exports = {
  createWallet,
  getWallets,
  getWallet
};
