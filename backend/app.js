const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Routes import
const transactionRoutes = require('./routes/transactionRoutes');

// Routes use
app.use('/api', transactionRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('ChainSync API Running');
});

module.exports = app;