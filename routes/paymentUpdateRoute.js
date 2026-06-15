const express = require('express');
const paymentUpdateService = require('../services/paymentUpdateService');
const router = express.Router()

router.get('/paymentupdate',paymentUpdateService)

module.exports = router;

