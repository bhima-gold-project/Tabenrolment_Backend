const express = require('express');
const customerService = require('../services/customerService');
const router = express.Router()

router.get('/customerdetails',customerService.customerService)
router.get('/:DraftID',customerService.draftCustomerService)

module.exports = router;

