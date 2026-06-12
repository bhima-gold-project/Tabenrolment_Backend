const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require("../db");

const schemeService =  async (req, res) => {
  const { branch } = req.query;
  if (!branch) {
    return res.status(400).send({ message: 'Branch code is required.' });
  }
  try {
    const pool = await poolPromise;
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
}

module.exports = schemeService;
