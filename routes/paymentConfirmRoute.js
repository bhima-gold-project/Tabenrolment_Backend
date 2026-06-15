const express = require('express');
const paymentConfirmService = require('../services/paymentConfirmation');
const router = express.Router()

router.get('/linkid',paymentConfirmService)

module.exports = router;

