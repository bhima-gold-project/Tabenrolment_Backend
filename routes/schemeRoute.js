const express = require('express');
const schemeService = require('../services/schemeService');
const router = express.Router()

router.get('/schemes',schemeService)

module.exports = router;

