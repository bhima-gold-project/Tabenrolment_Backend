const express = require('express');
const branchService = require('../services/branchService');
const router = express.Router()

router.get('/branchdetails',branchService)

module.exports = router;

