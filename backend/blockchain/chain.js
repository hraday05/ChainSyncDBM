const Block = require('./block');

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  createGenesisBlock() {
    return new Block(0, Date.now(), "Genesis Block", "0");
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(transactionHash) {
  const Block = require('./block');

  const newBlock = new Block(
    this.chain.length,
    Date.now(),
    transactionHash,
    this.getLatestBlock().hash
  );

  this.chain.push(newBlock);
}
}

module.exports =new Blockchain();