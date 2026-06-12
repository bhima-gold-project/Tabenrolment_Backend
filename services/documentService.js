const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require("../db");

const documentService =  async (req, res) => {
  try {
    const pool = await poolPromise;

    // Define the query
    const query = `select id,LovName from LoV where LoVKeyID=28 and id not in (24,30)`;
    const result = await pool.request().query(query);

    // Send the fetched data as a response
    res.status(500).json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = documentService;
