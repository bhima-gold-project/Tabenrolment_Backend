const express = require('express');
const router = express.Router();
const cors = require('cors');
const { poolPromise, sql } = require("./db");

router.use(cors());

// Route to fetch branch data
router.get('/', async (req, res) => {
  try {
    // Wait for the pool to be connected
    const pool = await poolPromise; 

    // Execute the query
    const result = await pool.request().query(
      `SELECT Branch_Code, Branch_Name 
       FROM CHSTU_BRANCH 
       WHERE object_status='O' 
       ORDER BY uniq_id`
    );

    // Send the fetched data as a response
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
