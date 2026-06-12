const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const { poolPromise, sql } = require("./db");
dotenv.config();
const router = express.Router();

router.use(cors()); // 
// Middleware
router.use(bodyParser.json());


router.post('/api/user/create-payment-link', async (req, res) => {
  try {
    const data = req.body;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': process.env.CASHFREE_API_VERSION,
      'x-client-id': process.env.CASHFREE_CLIENT_ID,
      'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
    };

    const response = await axios.post(
      'https://sandbox.cashfree.com/pg/links',//  const url = `https://api.cashfree.com/pg/links/${link_id}/orders?status=ALL`;
      data,
      { headers }
    );

    res.status(200).json({
      status: 'ok',
      data: response.data,
      message: `Payment link sent to ${response.data.customer_details?.customer_phone}`,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create payment link',
      details: err.response?.data || err.message,
    });
  }
});

// // API Route to Fetch Payment Link Details
router.get('/api/user/FetchDetails/:link_id', async (req, res) => {
  const { link_id } = req.params;

  const url = `https://sandbox.cashfree.com/pg/links/${link_id}`;

  try {
    // Fetch the link details from Cashfree
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': process.env.CASHFREE_API_VERSION,
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
      },
    });

    // Extract the link status from the response data
    const linkStatus = response.data?.link_status;

    // Construct the message based on link status
    let message = '';
    if (linkStatus === 'PAID') {
      message = 'Payment successful!';

    } else if (linkStatus === 'ACTIVE') {
      message = 'Payment link has been sent to your email and mobile number. Please pay through the link.';

    } else {
      message = `Link status is: ${linkStatus}. Please check the payment link status.`;
    }

    // Send the response with custom message based on the link status
    res.status(200).json({
      status: 'success',
      details: response.data,
      message: message,
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payment link details',
      details: error.response?.data || error.message,
    });
  }
});


router.get('/api/user/OrderDetails/:link_id', async (req, res) => {
  const pool = await poolPromise;
  const { link_id } = req.params;
  const url = `https://sandbox.cashfree.com/pg/links/${link_id}/orders?status=ALL`;
  //const url = `https://api.cashfree.com/pg/links/${link_id}/orders?status=ALL`;
  try {
    // Step 1: Fetch Order Details
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': process.env.CASHFREE_API_VERSION,
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
      },
    });

    const responseData = await response.json();
    const orderDetails = Array.isArray(responseData) ? responseData[0] : responseData;

    if (!orderDetails) {
      return res.status(404).json({
        status: 'error',
        message: 'OrderDetails not found',
      });
    }

    const { link_id: fetchedLinkId, order_status, payments, settlements, customer_name, customer_phone } = orderDetails;


    const dbCheckQuery = `
        SELECT CustomerName, CustomerMobileNo
        FROM DraftEnrollmentPaymentLog 
        WHERE PGlink_id = @PGlink_id
      `;
    const dbResult = await pool.request()
      .input('PGlink_id', sql.VarChar, fetchedLinkId)
      .query(dbCheckQuery);

    if (dbResult.recordset.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Fetched link_id not found in the database',
      });
    }


    // Step 4: Process order status
    if (order_status === 'PAID') {
      // Payments and settlements API calls
      if (!payments?.url || !settlements?.url) {
        throw new Error('Payments or Settlements URL is missing');
      }

      const paymentsResponse = await fetch(payments.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': process.env.CASHFREE_API_VERSION,
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        },
      });

      const paymentsData = await paymentsResponse.json();

      const settlementsResponse = await fetch(settlements.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': process.env.CASHFREE_API_VERSION,
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        },
      });

      const settlementsData = await settlementsResponse.json();

      return res.status(200).json({
        orderDetails: responseData,
        status: 'success',
        payments: paymentsData,
        settlements: settlementsData,
      });
    } else {
      // Payments API call only
      if (!payments?.url) {
        throw new Error('Payments URL is missing');
      }

      const paymentsResponse = await fetch(payments.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': process.env.CASHFREE_API_VERSION,
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        },
      });

      const paymentsData = await paymentsResponse.json();

      return res.status(200).json({
        status: 'info',
        message: `Order status is: ${order_status}`,
        orderDetails: responseData,
        payments: paymentsData,
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while processing the request',
      details: error.message,
    });
  }
});

//cancel link
router.get('/api/user/Cancel/:link_id', async (req, res) => {
  const { link_id } = req.params;

  const url = `https://sandbox.cashfree.com/pg/links/${link_id}/cancel`;

  try {
    // Fetch the link details from Cashfree

    const response = await axios.post(
      url,
      {},  // Empty body (since cancel request might not require a body)
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': process.env.CASHFREE_API_VERSION,
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        },
      }
    );

    res.status(200).json({
      status: 'success',
      details: response.data,
      message: response?.message, // <-- define message
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel payment link details',
      details: error.response?.data || error.message,
    });
  }
});

module.exports = router
