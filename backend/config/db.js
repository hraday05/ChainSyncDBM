// ============================================
// db.js — MySQL Connection Pools for 3 Regions
// ============================================
// WHY connection pools?
// A pool keeps multiple connections ready. Instead of opening a new
// connection for every query (slow), we reuse existing ones (fast).
// ============================================

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool for a region
// Each pool can hold up to 10 concurrent connections
function createPool(config) {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,   // Wait if all connections are busy
    connectionLimit: 10,         // Max 10 concurrent connections
    queueLimit: 0                // No limit on queued requests
  });
}

// India Region (Primary — all transactions are created here first)
const indiaDb = createPool({
  host: process.env.INDIA_DB_HOST,
  port: process.env.INDIA_DB_PORT,
  user: process.env.INDIA_DB_USER,
  password: process.env.INDIA_DB_PASSWORD,
  database: process.env.INDIA_DB_NAME
});

// US Region (Secondary — receives replicated data)
const usDb = createPool({
  host: process.env.US_DB_HOST,
  port: process.env.US_DB_PORT,
  user: process.env.US_DB_USER,
  password: process.env.US_DB_PASSWORD,
  database: process.env.US_DB_NAME
});

// EU Region (Secondary — receives replicated data)
const euDb = createPool({
  host: process.env.EU_DB_HOST,
  port: process.env.EU_DB_PORT,
  user: process.env.EU_DB_USER,
  password: process.env.EU_DB_PASSWORD,
  database: process.env.EU_DB_NAME
});

// Helper: get a pool by region name
function getDbByRegion(region) {
  switch (region) {
    case 'india': return indiaDb;
    case 'us': return usDb;
    case 'eu': return euDb;
    default: throw new Error(`Unknown region: ${region}`);
  }
}

// Test connection to a region
async function testConnection(pool, regionName) {
  try {
    const connection = await pool.getConnection();
    console.log(`  ✅ ${regionName} database connected`);
    connection.release();
    return true;
  } catch (error) {
    console.error(`  ❌ ${regionName} database FAILED: ${error.message}`);
    return false;
  }
}

// Test all 3 connections
async function testAllConnections() {
  console.log('\n🔗 Testing database connections...');
  const india = await testConnection(indiaDb, 'India (port 3307)');
  const us = await testConnection(usDb, 'US (port 3308)');
  const eu = await testConnection(euDb, 'EU (port 3309)');
  
  if (!india) {
    throw new Error('India (primary) database is required. Is Docker running?');
  }
  
  return { india, us, eu };
}

module.exports = {
  indiaDb,
  usDb,
  euDb,
  getDbByRegion,
  testAllConnections
};
