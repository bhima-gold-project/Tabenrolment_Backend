const express = require('express');
const router = express.Router();
const cors = require('cors');
const { poolPromise, sql } = require("./db");

router.use(cors());

router.get('/schemes', async (req, res) => {
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
        `SELECT Scheme_Code AS SchemeCode, Scheme_Name AS SchemeName, NoOf_Ins AS NoOfIns,
                InstallmentMultiples AS InsMultiples, MinInsValue, '200000' AS MaxInsValue,
                IsVariableInstallment AS isVariableAmt, SchemeType,CommodityTypeID
         FROM CHSTU_SCHEME 
         WHERE object_status = 'O' AND isClosed != 'Y' AND Scheme_Code != 'BSD'
           AND branch_code = @branch 
         ORDER BY uniq_id`
      );

    if (result.recordset.length > 0) {
      return res.status(200).send(result.recordset);
    } else {
      return res.status(404).send({ message: 'No data found' });
    }
  } catch (err) {
    return res.status(500).send({ message: 'Server error', error: err.message });
  }
});

router.get('/panvalidation', async (req, res) => {
  const { SchemeName, InstallmentAmount } = req.query; // Use `req.query` for GET parameters

  // Validate the input
  if (!SchemeName) {
    return res.status(400).send({ message: 'SchemeName is required.' });
  }

  // Validate the input
  if (!isNaN(InstallmentAmount)) {
    return res.status(400).send({ message: ' valid InstallmentAmount is required.' });
  }

  // Convert InstallmentAmount to a number
  const amount = Number(InstallmentAmount);

  // Check the InstallmentAmount threshold
  const isAmountGreaterThan2Lakh = amount * 11 > 200000;

  // Send the response
  return res.status(200).send({
    SchemeName,
    isAmountGreaterThan2Lakh,
  });
});


module.exports = router;
