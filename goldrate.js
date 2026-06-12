const express = require('express');
const router = express.Router();
const cors = require('cors');
const { poolPromise, sql } = require("./db");

router.use(cors());

router.get('/', async (req, res) => {
  const { branch } = req.query;

  if (!branch) {
    return res.status(400).send({ message: 'Branch number is required.' });
  }

  try {
    const pool = await poolPromise; // Use shared pool

    // Create a new request object using the connected pool
    const result = await pool
      .request()
      .input('branch', sql.VarChar, branch)
      .query(
        `SELECT Rate FROM vGOLDRATE WHERE CommodityTypeID IN (1,2,6,7) AND Branch_Code = @branch`
      );

    if (result.recordset.length > 0) {
      return res.status(200).send({ data: result.recordset });
    } else {
      return res.status(404).send({ message: 'No data found for the given branch.' });
    }
  } catch (err) {
    return res.status(500).send({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
