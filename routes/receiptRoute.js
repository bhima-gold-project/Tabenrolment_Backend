const express = require('express');
const receiptService = require('../services/receiptService');
const router = express.Router()

router.get('/resposne/:PGLinkID',receiptService)

module.exports = router;