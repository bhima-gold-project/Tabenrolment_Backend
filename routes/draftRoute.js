const express = require('express');
const draftDataService = require('../services/draftDataService');
const router = express.Router()

router.get('/draftenrollment',draftDataService)

module.exports = router;

