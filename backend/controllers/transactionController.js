const { generateHash } = require('../services/hashService');
const Block = require('../blockchain/block');
const blockchain = require('../blockchain/chain');
const crypto = require('crypto');

const createTransaction = (req, res) => {
  const { sender, receiver, amount } = req.body;

  const transaction = {
    id: Date.now(),
    sender,
    receiver,
    amount,
    timestamp: Date.now(),
  };

  // 🔑 STEP 1: Generate Hash BEFORE anything
  const transactionHash = generateHash(transaction);

  // 🔗 STEP 2: Add to Blockchain
  const newBlock = new Block(
    blockchain.chain.length,
    Date.now(),
    transactionHash
  );

  blockchain.addBlock(transactionHash);

  res.json({
    message: "Transaction successful",
    transaction,
    hash: transactionHash,
    block: newBlock,
  });
};

const verifyTransaction = (req, res) => {
    const { transaction, hash, block } = req.body;

    // ✅ STEP 1: Verify Transaction Hash
    const recalculatedTxHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(transaction))
        .digest('hex');

    const isTransactionValid = recalculatedTxHash === hash;

    // ✅ STEP 2: Verify Block Hash
    const recalculatedBlockHash = crypto
        .createHash('sha256')
        .update(
            block.index +
            block.timestamp +
            block.transactionHash +
            block.previousHash
        )
        .digest('hex');

    const isBlockValid = recalculatedBlockHash === block.hash;

    // ✅ FINAL RESULT
    if (isTransactionValid && isBlockValid) {
        return res.json({
            message: "✅ Transaction & Block are VALID"
        });
    } else {
        return res.json({
            message: "❌ Data is TAMPERED",
            details: {
                transactionValid: isTransactionValid,
                blockValid: isBlockValid
            }
        });
    }
};

module.exports = { createTransaction, verifyTransaction };
