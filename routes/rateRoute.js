const express = require('express');
const rateService = require('../services/rateService');
const router = express.Router()

router.get('/goldrate',rateService)

module.exports = router;

