const express = require('express');
const validationService = require('../services/validationService');
const router = express.Router()

router.get('/panvalidation',validationService.panValidationService)

module.exports = router;

