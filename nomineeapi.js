const express = require('express');
const router = express.Router();
const cors = require('cors');
const { poolPromise, sql } = require("./db");

router.use(cors());

// Route to get nominee details
router.get('/', async (req, res) => {
  try {
    // Wait for the pool connection to be ready
    const pool = await poolPromise; // Use shared pool

    // Define and execute the query
    const query = `SELECT ID, Name FROM vNomineeDetails ORDER BY DispalyOrder`;
    const result = await pool.request().query(query);

    // Send the fetched data as a JSON response
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
