const express = require('express');
const paymentConfirmService = require('../services/paymentConfirmation');
const router = express.Router()

router.post('/linkid',paymentConfirmService)

module.exports = router;

