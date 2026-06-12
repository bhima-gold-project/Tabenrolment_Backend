const express = require('express');
const guardianService = require('../services/guardianService');
const router = express.Router()

router.get('/guardiandetails',guardianService)

module.exports = router;

