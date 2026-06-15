const express = require('express');
const paymentUpdateService = require('../services/paymentUpdateService');
const router = express.Router()

router.post('/paymentupdate',paymentUpdateService)

module.exports = router;

