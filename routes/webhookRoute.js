const express = require('express');
const webhookService = require('../services/webhookService');
const router = express.Router()

router.post('/webhook',webhookService)

module.exports = router;

