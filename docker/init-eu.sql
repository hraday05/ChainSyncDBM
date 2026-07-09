-- ============================================
-- ChainSync EU Region - Database Init
-- ============================================

USE chainsync_eu;

CREATE TABLE IF NOT EXISTS wallets (
    wallet_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    balance DECIMAL(15,2) DEFAULT 1000.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    sender VARCHAR(100) NOT NULL,
    receiver VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_type VARCHAR(20) DEFAULT 'transfer',
    hash VARCHAR(255) NOT NULL,
    signature TEXT,
    status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
    block_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_block_id (block_id),
    INDEX idx_sender (sender),
    INDEX idx_receiver (receiver)
);

CREATE TABLE IF NOT EXISTS blocks (
    block_id INT AUTO_INCREMENT PRIMARY KEY,
    previous_hash VARCHAR(255) NOT NULL,
    merkle_root VARCHAR(255) NOT NULL,
    current_hash VARCHAR(255) NOT NULL,
    nonce INT NOT NULL,
    difficulty INT DEFAULT 3,
    transaction_count INT DEFAULT 0,
    mined_by VARCHAR(100) DEFAULT 'system',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_previous_hash (previous_hash),
    INDEX idx_current_hash (current_hash)
);

CREATE TABLE IF NOT EXISTS replication_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT DEFAULT NULL,
    block_id INT DEFAULT NULL,
    source_region VARCHAR(20) NOT NULL,
    target_region VARCHAR(20) NOT NULL,
    status ENUM('pending', 'synced', 'failed') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME DEFAULT NULL,
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSON,
    region VARCHAR(20) DEFAULT 'eu',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);

INSERT INTO blocks (previous_hash, merkle_root, current_hash, nonce, difficulty, transaction_count, mined_by)
VALUES ('0', '0', 'genesis_block_hash_chainsync', 0, 3, 0, 'system');
