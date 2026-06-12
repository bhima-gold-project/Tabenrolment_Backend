const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require("../db");

const panValidationService =  async (req, res) => {
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
}

module.exports = {panValidationService}