const express = require('express');
const nomineeService = require('../services/nomineeService');
const router = express.Router()

router.get('/nomineedetails',nomineeService)

module.exports = router;

