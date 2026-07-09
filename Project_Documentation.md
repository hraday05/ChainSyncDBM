# ChainSync - Blockchain-Inspired Distributed DBMS ⛓️

## 1. Project Overview
**ChainSync** is a custom-built, purely distributed transaction verification system designed to simulate the core principles of a blockchain network (decentralization, cryptography, consensus, and immutability) using a traditional Relational Database Management System (RDBMS) architecture distributed across multiple geographical regions.

The system bypasses third-party blockchain frameworks (like Ethereum or Hyperledger) and instead implements the fundamental primitives—such as Proof-of-Work (PoW), Merkle Trees, RSA Signatures, and Peer-to-Peer Replication—from scratch in Node.js and MySQL.

---

## 2. Technology Stack Used
-   **Frontend:** HTML5, CSS3 (Vanilla), Vanilla JavaScript, Chart.js (for analytics). No heavy framework is used, ensuring a lightweight and extremely fast client.
-   **Backend:** Node.js, Express.js (REST API framework).
-   **Database:** MySQL 8.0 (Relational Database) across 3 distributed nodes.
-   **Infrastructure & Containerization:** Docker, Docker Compose (Linux/arm64 configuration).
-   **Libraries & Packages:**
    -   `express`: Web server and API routing.
    -   `mysql2`: Asynchronous MySQL client for Node.js (with built-in connection pooling).
    -   `crypto`: Node.js native module for RSA key generation, signatures, and SHA-256 hashing.
    -   `cors`: Middleware for handling Cross-Origin Resource Sharing.
    -   `dotenv`: Managing environment variables and configurations securely.

---

## 3. Architecture & Core Components (What is Already Built)

### A. Multi-Region Distributed Database (The Network)
Instead of a single database, the system uses **Docker Compose** to spin up three independent MySQL 8.0 containers:
*   `chainsync-india` (Primary node, Port: 3307)
*   `chainsync-us` (Secondary region node, Port: 3308)
*   `chainsync-eu` (Secondary region node, Port: 3309)

This simulates a geographically dispersed network. The Node.js application `db.js` creates a dedicated connection pool for each database to handle queries asynchronously.

### B. Wallets & Cryptography
*   **Wallet Creation:** (`walletController.js` & `walletRoutes.js`) When a new user creates an account, the backend uses the native `crypto` library to generate a pair of **RSA Key Pairs** (Public and Private keys).
*   **Signatures:** The private key is used to "sign" transactions to prove authenticity. The public key is stored in the database so anyone can verify the signature.

### C. Transactions & The Mempool
*   **Transaction Flow:** (`transactionController.js`) A user initiates a transaction from one wallet to another. 
*   **Pending State (Mempool):** Transactions do not execute immediately. They are stored in the database with a `status` of `pending`. This mimics a blockchain's "Mempool" (Memory Pool) where unconfirmed transactions wait to be picked up by a miner.

### D. Mining & Proof-of-Work (Consensus)
*   **Block Creation:** (`blockController.js` & `miningService.js`) A miner bundles pending transactions into a new Block.
*   **Merkle Trees:** (`merkleService.js`) All transactions in the block are hashed together using a Merkle Tree structure to produce a single `Merkle Root`. This ensures that altering even a single transaction changes the entire tree.
*   **Proof of Work (PoW):** The system mandates a computational puzzle. The miner must repeatedly hash the block's data with a changing number (the `nonce`) until the resulting SHA-256 hash starts with a specific number of leading zeros (e.g., `0000`). This secures the network against rapid, fraudulent block creation.

### E. Replication & Synchronization
*   **Master-Slave Syncing:** (`replicationController.js` & `replicationService.js`) Once a block is verified and added to the primary node (India), the backend syncs this data over to the US and EU databases.
*   **Integrity Verification:** The system allows comparing the database state across all three regions to ensure data consistency and detect tampering.

### F. Frontend Dashboard
*   A single-page application (`index.html`) featuring a modern **Light Theme Design**.
*   **Dashboard View:** Shows real-time statistics (Total Transactions, Pending, Blockchain Height) and an activity graph powered by Chart.js. Contains forms to create wallets and initiate transactions.
*   **Blockchain View:** A ledger table displaying mined blocks, their hashes, and the previous block's hash.
*   **Replication View:** Allows manual triggering of database synchronization across regions.

---

## 4. Code Breakdown: How It All Glues Together

### `docker-compose.yml`
Defines the infrastructure. It creates three isolated MySQL instances mapping standard port 3306 to host ports 3307, 3308, and 3309. It runs `.sql` initialization scripts to set up the schemas on startup and uses health checks to ensure databases are ready.

### `backend/config/db.js`
Handles the database logic. It sets up three `createPool()` functions utilizing `mysql2/promise`. It allows the backend multiplexing connections efficiently without crashing under load.

### `backend/server.js`
The main entry point. Sets up Express, applies CORS/JSON middleware, serves the static HTML interface, sets up the REST API routing (e.g., `/api/transactions`, `/api/blocks`), and tests connections to all three databases on startup.

### `backend/services/cryptoService.js` & `hashService.js`
Contains utility functions leveraging Node's `crypto` module. `hashService` produces SHA-256 hashes of block headers. `cryptoService` manages RSA generation and verification of transaction data.

### `frontend/index.html`
A cohesive UI that relies on asynchronous JavaScript `fetch()` calls to interact with the backend API. It uses CSS Grid/Flexbox for a responsive layout and relies heavily on CSS variables for consistent theming.
