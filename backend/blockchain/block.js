class Block {
  constructor(index, timestamp, transactionHash, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.transactionHash = transactionHash;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(
        this.index +
        this.timestamp +
        this.transactionHash +
        this.previousHash
      )
      .digest('hex');
  }
}

module.exports = Block;