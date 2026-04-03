const { generateHash } = require('../services/hashService');
const Blockchain = require('../blockchain/chain');
const Block = require('../blockchain/block');

const blockchain = new Blockchain();

exports.createTransaction = (req, res) => {
  const { sender, receiver, amount } = req.body;

  const transaction = {
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

  blockchain.addBlock(newBlock);

  res.json({
    message: "Transaction successful",
    transaction,
    hash: transactionHash,
    block: newBlock,
  });
};

exports.verifyTransaction = (req, res) => {
  const { transaction, hash } = req.body;

  const { generateHash } = require('../services/hashService');

  const recalculatedHash = generateHash(transaction);

  if (recalculatedHash === hash) {
    return res.json({
      status: "VALID",
      message: "Transaction is safe"
    });
  } else {
    return res.json({
      status: "TAMPERED",
      message: "Transaction has been modified!"
    });
  }
};