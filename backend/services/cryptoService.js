// ============================================
// cryptoService.js — RSA Digital Signatures
// ============================================
// WHY digital signatures?
// In real blockchains, when Alice sends money to Bob:
//   1. Alice SIGNS the transaction with her PRIVATE key
//   2. Anyone can VERIFY the signature using Alice's PUBLIC key
//   3. This proves Alice actually authorized it (not an impersonator)
//
// Think of it like:
//   Private key = your handwritten signature (only you have it)
//   Public key  = everyone knows what your signature looks like
//   Signing     = writing your signature on a cheque
//   Verifying   = bank checking if the signature matches
// ============================================

const crypto = require('crypto');

// Generate RSA key pair for a new wallet
// Returns { publicKey, privateKey } as PEM-encoded strings
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,         // Key size (2048 bits = secure enough)
    publicKeyEncoding: {
      type: 'spki',              // Standard public key format
      format: 'pem'              // PEM = text format (starts with -----BEGIN PUBLIC KEY-----)
    },
    privateKeyEncoding: {
      type: 'pkcs8',             // Standard private key format
      format: 'pem'
    }
  });
  return { publicKey, privateKey };
}

// Sign data with a private key
// Returns a hex-encoded signature string
function signData(data, privateKey) {
  const signer = crypto.createSign('SHA256');   // Use SHA-256 for signing
  signer.update(data);                           // Feed in the data to sign
  signer.end();
  return signer.sign(privateKey, 'hex');         // Sign with private key → hex string
}

// Verify a signature with a public key
// Returns true if the signature is valid, false if not
function verifySignature(data, signature, publicKey) {
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(data);
    verifier.end();
    return verifier.verify(publicKey, signature, 'hex');
  } catch (error) {
    // If the key is invalid or corrupted, verification fails
    return false;
  }
}

// Create the data string that gets signed for a transaction
// This must be EXACTLY the same during signing and verification
function getTransactionSignData(transaction) {
  return `${transaction.sender}|${transaction.receiver}|${transaction.amount}`;
}

module.exports = {
  generateKeyPair,
  signData,
  verifySignature,
  getTransactionSignData
};
