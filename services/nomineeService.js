const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require("../db");

const nomineeService = async (req, res) => {
  try {
    const pool = await poolPromise; 

    const query = `SELECT ID, Name FROM vNomineeDetails ORDER BY DispalyOrder`;
    const result = await pool.request().query(query);

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = nomineeService;
