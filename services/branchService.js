const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require("../db");

const branchService =  async (req, res) => {
  try {
    const pool = await poolPromise;

    const query = `SELECT Branch_Code, Branch_Name FROM CHSTU_BRANCH WHERE object_status='O' ORDER BY uniq_id`;
    const result = await pool.request().query(query);

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = branchService;
