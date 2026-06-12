const express = require('express');
const documentService = require('../services/documentService');
const router = express.Router()

router.get('/doclist',documentService)

module.exports = router;

