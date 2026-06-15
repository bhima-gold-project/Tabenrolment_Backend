const express = require('express');
const webhookService = require('../services/webhookService');
const router = express.Router()

router.get('/webhook',webhookService)

module.exports = router;

