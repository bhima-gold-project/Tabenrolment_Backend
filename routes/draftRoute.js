const express = require('express');
const draftDataService = require('../services/draftDataService');
const router = express.Router()

router.post('/draftenrollment',draftDataService)

module.exports = router;

