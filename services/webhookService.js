const express = require('express');
const axios = require('axios');
const { poolPromise, sql } = require('../db');
const crypto = require('crypto');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const dotenv = require('dotenv')
dotenv.config();

const webhookService =  async (req, res) => {
  try {
    const rawBody = req.rawBody
    const signature = req.headers['x-webhook-signature']
    const timestamp = req.headers['x-webhook-timestamp']

    const signedPayload = `${timestamp}.${rawBody}`;

    const generatedSignature = crypto.createHmac('sha256', process.env.CASHFREE_CLIENT_SECRET).update(signedPayload).digest("base64");


    // if (signature !== generatedSignature) {
    //   return res.status(400).send("Invalid signature");
    // }


    const eventData = req.body;

    const order = eventData?.data?.order;
    const orderTags = order?.order_tags;
    const customerData = eventData?.data?.customer_details;
    const paymentData = eventData?.data?.payment;


    // Step 1: Check for correct event type
    // if (eventData?.type !== 'PAYMENT_LINK_EVENT') {
    //   return res.status(400).json({ message: 'Unsupported event type' });
    // }

    // Step 2: Check payment status
    if (paymentData?.payment_status !== 'SUCCESS') {
      return res.status(200).json({ message: `Transaction not successful: ${paymentData.payment_status}` });
    }

    // Step 3: Set default values
    const insertedTime = new Date();
    insertedTime.setHours(insertedTime.getHours() + 5);
    insertedTime.setMinutes(insertedTime.getMinutes() + 30);

    const pool = await poolPromise;
    const request = pool.request();




    // Step 4: Set parameters for the first update
    request.input("CustomerName", sql.VarChar, customerData?.customer_name || null);
    request.input("CustomerMobileNo", sql.VarChar, customerData?.customer_phone?.replace('+91', '').trim() || null);

    request.input("PGProvider", sql.VarChar, 'Cashfree');
    request.input("TxnDate", sql.DateTime, eventData?.event_time ? new Date(eventData.event_time) : null);
    request.input("TxnCurrrency", sql.VarChar, order?.order_currency || 'INR');   // ✅ from order, not link_currency
    request.input("TxnStatus", sql.VarChar, paymentData?.payment_status || null); // ✅ from payment, not order_tags
    request.input("Request_Body", sql.NVarChar, JSON.stringify(eventData));
    request.input("pg_sessionId", sql.NVarChar, null); // Not in payload
    request.input("PGTxnRefNo", sql.VarChar, order?.order_id || null);            // ✅ from order
    request.input("PGPayMode", sql.VarChar, paymentData?.payment_group || null);
    request.input("PGTxn_paymentid", sql.BigInt, paymentData?.cf_payment_id || null);
    request.input("PayModeTxnResponse", sql.VarChar, paymentData?.payment_message || null);
    request.input("PaymentDate", sql.DateTime, paymentData?.payment_time ? new Date(paymentData.payment_time) : null);
    request.input("PGlink_id", sql.VarChar, orderTags?.link_id || null);

    // Step 5: Update DraftEnrollmentPaymentLog
    const result = await request.query(`
      UPDATE DraftEnrollmentPaymentLog
      SET PGProvider = @PGProvider, 
          TxnDate = @TxnDate, 
          TxnCurrrency = @TxnCurrrency, 
          TxnStatus = @TxnStatus,
          Request_Body = @Request_Body, 
          pg_sessionId = @pg_sessionId, 
          PGTxnRefNo = @PGTxnRefNo,
          PGPayMode = @PGPayMode, 
          PGTxn_paymentid = @PGTxn_paymentid, 
          PayModeTxnResponse = @PayModeTxnResponse,
          PaymentDate = @PaymentDate
      WHERE PGlink_id = @PGlink_id 
        AND CustomerName = @CustomerName 
        AND CustomerMobileNo = @CustomerMobileNo
    `);


    const responseStatus = result.rowsAffected[0] === 0 ? 404 : 200;
    if (responseStatus !== 200) {
      return res.status(404).json({ message: 'No matching record found to update.' });
    }

    // Step 6: Save response in DraftEnrollmentPaymentLog
    request.input("Response", sql.VarChar, JSON.stringify({ status: 200, message: "Data updated successfully" }));
    await request.query(`
      UPDATE DraftEnrollmentPaymentLog
      SET Response = @Response 
      WHERE PGlink_id = @PGlink_id
    `);

    // Step 7: Update DraftEnrollment table
    await request.query(`
      UPDATE DraftEnrollment
      SET TxnStatus = @TxnStatus, 
          PGTxnRefNo = @PGTxnRefNo,
          CFPaymentID = @PGTxn_paymentid
      WHERE Cust_Name = @CustomerName 
        AND Mobile_No = @CustomerMobileNo 
        AND PGlink_ID = @PGlink_id
    `);

    // Step 8: Get DraftID
    const draftIdResult = await pool.request()
      .input("dfPGlink_ID", sql.VarChar, orderTags?.link_id)
      .query(`SELECT DraftID FROM DraftEnrollmentPaymentLog WHERE PGlink_id = @dfPGlink_ID`);

    if (draftIdResult?.recordset?.length === 0) {
      return res.status(404).json({ message: "No DraftID found for this PGlink_id" });
    }

    const draftId = draftIdResult?.recordset?.[0]?.DraftID;

    // 🔁 Call newmember-creationTE API
    const newMemberApiUrl = 'https://suvarnagopura.com/VrudhiPortalAPI/api/payment-gateway/newmember-creationTE';
    //const newMemberApiUrl = 'https://192.168.1.253/VrudhiPortalAPI/api/payment-gateway/newmember-creationTE';
    const requestPayload = { ID: draftId, Status: 'SUCCESS' };

    let logStatus = 'Not OK';
    let logResponseBody = '';
    let newMemberResponseData = null;

    try {
      const apiResponse = await axios.post(newMemberApiUrl, requestPayload);
      newMemberResponseData = apiResponse.data;
      logStatus = apiResponse.status === 200 ? 'OK' : 'Not OK';
      logResponseBody = JSON.stringify(apiResponse.data);
    } catch (error) {
      logResponseBody = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
    }

    // ✏️ Log ONLY the newmember-creationTE API
    const logRequest = pool.request();
    logRequest.input('RequestType', sql.VarChar, 'POST');
    logRequest.input('RequestBody', sql.VarChar, newMemberApiUrl);
    logRequest.input('Status', sql.VarChar, logStatus);
    logRequest.input('ResponseBody', sql.NVarChar, logResponseBody);
    logRequest.input('UpdateOn', sql.DateTime, insertedTime);
    logRequest.input("CustomerMobileNo", sql.VarChar, orderTags?.link_id || null);
    // logRequest.input("CustomerMobileNo", sql.VarChar, customerData.customer_phone || null);
    logRequest.input("CRM_ID", sql.Int, 0);
    logRequest.input("RetryCount", sql.Int, 1);

    await logRequest.query(`
      INSERT INTO crmlog (RequestType, RequestBody, Status, ResponseBody, UpdateOn, MobileNo, CRM_ID, RetryCount)
      VALUES (@RequestType, @RequestBody, @Status, @ResponseBody, @UpdateOn, @CustomerMobileNo, @CRM_ID, @RetryCount)
    `);

    // ✅ If successful, proceed to CRM Upload — no logging here
    if (logStatus === 'OK') {
      const draftDataResult = await pool.request()
        .input("DraftID", sql.Int, draftId)
        .query(`SELECT * FROM DraftEnrollment WHERE ID = @DraftID`);

      const documentResult = await pool.request()
        .input("DraftID", sql.Int, draftId)
        .query(`SELECT * FROM DraftCustomerDocuments WHERE DraftID = @DraftID`);


      const draftData = draftDataResult.recordset[0];
      const documentTypeMap = { 25: "PAN", 26: "DIR", 27: "VOT", 28: "PAS", 29: "AAD" };

      const documents = documentResult.recordset.map(doc => ({

        Type: documentTypeMap[doc.DocumentTypeID] || "Unknown",
        Name: doc.DocumentDecription || "",
        ImagePath: doc.ImageURL || "",


        UpdatedOn: doc.Updated_On || doc.Inserted_On || new Date().toISOString(),
        IsActive: doc.IsActive ?? true
      }));

      if (draftData.ImageUrl) {
        const timestamp = Date.now(); // current timestamp
        const profileFileName = `${draftData.Cust_Name || 'Customer'}_${draftData.Mobile_No || ''}_${timestamp}${path.extname(draftData.ImageUrl) || '.jpg'}`;

        documents.push({
          Type: "IMG",
          Name: profileFileName,
          ImagePath: draftData.ImageUrl,  // path in 'images' folder
          UpdatedOn: draftData.updated_on || new Date().toISOString(),
          IsActive: true
        });
      }

      const nomineeDetails = draftData.NomineName ? [{
        NomineRelationship: draftData.NomineRelationship || "",
        NomineName: draftData.NomineName || "",
        NomineAddress: draftData.NomineAddress || "",
        NominePhone: draftData.NominePhone || "",
        IsActive: draftData.NomineeIsActive ?? true
      }] : [];

      const bankdata = draftData.ifsccode || draftData.Accountno ? [{
        ifsccode: draftData.ifsccode || "",
        Accountno: draftData.Accountno || "",
        IsActive: draftData.BankIsActive ?? true
      }] : [];

      const postRequestBody = {
        ID: draftData.ID,
        CustomerType: draftData.CustomerType || "V",
        Salutation: draftData.Salutation || "",
        Name: draftData.Cust_Name || "",
        Address1: draftData.Address1 || "",
        Address2: draftData.Address2 || "",
        Address3: draftData.Address3 || "",
        City: draftData.City || "",
        State: draftData.State || "",
        PinCode: draftData.Pin_Code || "",
        MobileNo: draftData.Mobile_No || "",
        PhoneNo: draftData.PhoneNo || "",
        DateOfBirth: draftData.DateOf_Birth || null,
        WeddingAnnivarsaryDate: draftData.WeddingAnnivarsaryDate || "1900-01-01T00:00:00.000Z",
        EmailID: draftData.email_id || "",
        Age: draftData.Age || 0,
        Sex: draftData.Gender || "",
        GSTTIN: draftData.GSTTIN || "",
        LocalityID: draftData.LocalityID || "",
        StateCode: draftData.StateCode || 0,
        CountryCode: draftData.CountryCode || "",
        CountryName: draftData.CountryName || "",
        CreatedDate: draftData.inserted_on || new Date().toISOString(),
        UpdatedDate: draftData.updated_on || new Date().toISOString(),
        ObjectStatus: "O",
        PrivilegeID: draftData.PrivilegeID || "",
        CustCode: draftData.CustCode || "",
        CreditLimit: draftData.CreditLimit || 0,
        CompanyCode: draftData.CompanyCode || "",
        BranchCode: draftData.Branch || "",
        CustID: draftData.CustID || 0,
        ChitCardNo: draftData.ChitCardNo || "0",
        IsActive: true,
        Religion: draftData.Religion || "",
        Profession: draftData.Profession || "",
        NewCustID: draftData.ID,
        IsParent: draftData.IsParent ?? 1,
        Aadharname: draftData.Aadharname || "",
        Panname: draftData.Panname || "",
        Ismobileverified: draftData.Ismobileverified ?? 0,
        Isaadharverified: draftData.IsAadarVerified ? 1 : 0,
        Profileimg: draftData.ImageUrl || "",
        CustomerID: draftData.ID,
        Documents: documents,
        Nominee: nomineeDetails,
        BankDetails: bankdata
      };

      const form = new FormData();
      form.append('documents', JSON.stringify(postRequestBody));

      for (const doc of documents) {
        if (doc.ImagePath) {
          const imagePath = path.resolve(__dirname, 'images', doc.ImagePath);
          if (fs.existsSync(imagePath)) {
            form.append('images', fs.createReadStream(imagePath), doc.Name || doc.ImagePath);
          }
        }
      }

      await axios.post('https://suvarnagopura.com/CRM/api_db.js/api/Customerdataupload', form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
    }

    return res.status(200).json({ message: 'New member process completed', newMemberResponseData });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = webhookService;
