const express = require('express');
const paymentService = require('../services/paymentService');
const router = express.Router()

router.post('/user/create-payment-link',paymentService.createPaymentLink)
router.get('/user/FetchDetails/:link_id',paymentService.fetchPaymentLinkDetails)
router.get('/user/OrderDetails/:link_id',paymentService.fetchOrderDetails)
router.get('/user/Cancel/:link_id',paymentService.cancelPayment )

module.exports = router;

