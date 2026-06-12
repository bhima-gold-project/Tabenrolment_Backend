const sql = require('mssql');

// Database configuration
const config = {
  user: 'magnaapp',
  password: 'magna2012',
  server: '123.253.10.200',
  database: 'VrudhiPortal',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    setTimeout: 300000,
  },
};

// Create and export a shared pool promise
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log('Connected to SQL Server');
    return pool;
  })
  .catch((error) => {
    throw error;
  });

module.exports = {
  sql,
  poolPromise, // Use this shared pool in your routes
};
