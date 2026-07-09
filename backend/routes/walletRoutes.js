// Wallet Routes
const express = require('express');
const router = express.Router();
const { createWallet, getWallets, getWallet } = require('../controllers/walletController');

router.post('/', createWallet);           // POST /api/wallets
router.get('/', getWallets);              // GET  /api/wallets
router.get('/:username', getWallet);      // GET  /api/wallets/:username

module.exports = router;
