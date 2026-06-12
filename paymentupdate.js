const express = require("express");
const { poolPromise, sql } = require("./db");
const axios = require("axios");
const router = express.Router();
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

router.post("/", async (req, res) => {
    const data = req.body;
    let transaction;

    try {
        const Request_Body = JSON.stringify(data);
        const pool = await poolPromise;
        transaction = await pool.transaction();
        await transaction.begin();

        const insertedTime = new Date();
        insertedTime.setHours(insertedTime.getHours() + 5);
        insertedTime.setMinutes(insertedTime.getMinutes() + 30);

        const transactionRequest = transaction.request();
        transactionRequest.input("PGProvider", sql.VarChar, data.PGProvider || null);
        transactionRequest.input("TxnDate", sql.DateTime, data.TxnDate || null);
        transactionRequest.input("TxnCurrrency", sql.VarChar, data.TxnCurrrency || null);
        transactionRequest.input("TxnStatus", sql.VarChar, data.TxnStatus || null);
        transactionRequest.input("Request_Body", sql.NVarChar, Request_Body);
        transactionRequest.input("pg_sessionId", sql.NVarChar, data.pg_sessionId || null);
        transactionRequest.input("PGTxnRefNo", sql.VarChar, data.PGTxnRefNo || null);
        transactionRequest.input("PGPayMode", sql.VarChar, data.PGPayMode || null);
        transactionRequest.input("PGTxn_paymentid", sql.BigInt, data.PGTxn_paymentid || null);
        transactionRequest.input("PayModeTxnResponse", sql.VarChar, data.PayModeTxnResponse || null);
        transactionRequest.input("PaymentDate", sql.DateTime, insertedTime);
        transactionRequest.input("PGlink_id", sql.VarChar, data.PGlink_id);
        transactionRequest.input("CustomerName", sql.VarChar, data.CustomerName || null);
        transactionRequest.input("CustomerMobileNo", sql.VarChar, data.CustomerMobileNo || null);

        const updatePaymentLog = await transactionRequest.query(`
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

        if (updatePaymentLog.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: "No matching record found in DraftEnrollmentPaymentLog." });
        }

        const responseData = {
            status: 200,
            message: "Data updated successfully",
            updatedData: req.body,
        };
        const responseJson = JSON.stringify(responseData);
        transactionRequest.input("Response", sql.VarChar, responseJson);

        await transactionRequest.query(`
            UPDATE DraftEnrollmentPaymentLog
            SET Response = @Response 
            WHERE PGlink_id = @PGlink_id
        `);

        transactionRequest.input("dfPGlink_ID", sql.VarChar, data.PGlink_id);
        transactionRequest.input("dfTxnStatus", sql.VarChar, data.TxnStatus || null);
        transactionRequest.input("dfCust_Name", sql.VarChar, data.CustomerName || null);
        transactionRequest.input("dfMobile_No", sql.VarChar, data.CustomerMobileNo || null);
        transactionRequest.input("dfPGTxnRefNo", sql.VarChar, data.PGTxnRefNo || null);
        transactionRequest.input("dfPGTxn_paymentid", sql.BigInt, data.PGTxn_paymentid || null);

        const updateEnrollment = await transactionRequest.query(`
            UPDATE DraftEnrollment
            SET TxnStatus = @dfTxnStatus,
                PGTxnRefNo = @dfPGTxnRefNo,
                CFPaymentID = @dfPGTxn_paymentid
            WHERE Cust_Name = @dfCust_Name 
              AND Mobile_No = @dfMobile_No 
              AND PGlink_ID = @dfPGlink_ID
        `);

        if (updateEnrollment.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: "No matching record found in DraftEnrollment." });
        }

        await transaction.commit();

        const draftIdRequest = pool.request();
        draftIdRequest.input("dfPGlink_ID", sql.VarChar, data.PGlink_id);
        const draftIdResult = await draftIdRequest.query(`
            SELECT DraftID FROM DraftEnrollmentPaymentLog WHERE PGlink_id = @dfPGlink_ID
        `);

        if (draftIdResult.recordset.length === 0) {
            return res.status(404).json({ message: "No DraftID found for this PGlink_id" });
        }

        const draftId = draftIdResult.recordset[0].DraftID;
        const externalApiUrl = 'https://suvarnagopura.com/VrudhiPortalAPI/api/payment-gateway/newmember-creationTE';
        const requestPayload = { ID: draftId, Status: 'SUCCESS' };

        let externalApiResponse = null;
        let logStatus = 'Not OK';
        let logResponseBody = '';
        let crmlogResponseBody = '';

        try {
            const apiResponse = await axios.post(externalApiUrl, requestPayload);
            externalApiResponse = apiResponse.data;
            logStatus = apiResponse.status === 200 ? 'OK' : 'Not OK';
            crmlogResponseBody = JSON.stringify(apiResponse.data);

           if (logStatus === 'OK') {
    const dataRequest = pool.request();
    dataRequest.input("DraftID", sql.Int, draftId);

    const draftResult = await dataRequest.query(`SELECT * FROM DraftEnrollment WHERE ID = @DraftID`);
    const documentResult = await dataRequest.query(`SELECT * FROM DraftCustomerDocuments WHERE DraftID = @DraftID`);

    if (draftResult.recordset.length === 0) {
        return res.status(404).json({ message: "DraftEnrollment not found." });
    }

    const draftData = draftResult.recordset[0];
    draftData.IsAadarVerified = draftData.IsAadarVerified ? 1 : 0;

    const documentTypeMap = {
        25: "PAN",
        26: "DIR",
        27: "VOT",
        28: "PAS",
        29: "AAD"
    };

    const documents = documentResult.recordset.map(doc => ({
        Type: documentTypeMap[doc.DocumentTypeID] || "Unknown",
        Name: doc.DocumentDecription || "",
        ImagePath: doc.ImageURL ? path.basename(doc.ImageURL) : "",
        UpdatedOn: doc.Updated_On || doc.Inserted_On || new Date().toISOString(),
        IsActive: doc.IsActive ?? true
    }));

                const nomineeDetails = [{
                    NomineRelationship: draftData.NomineRelationship,
                    NomineName: draftData.NomineName,
                    NomineAddress: draftData.NomineAddress,
                    NominePhone: draftData.NominePhone,
                    IsActive: draftData.NomineeIsActive,
                }];
                const bankdata = [{
                    ifsccode: draftData.ifsccode,
                    Accountno: draftData.Accountno,
                    IsActive: draftData.BankIsActive,
                }];

                const postRequestBody = {
                    ID: draftData.ID || null,
                    CustomerType: "V",
                    Salutation: "",
                    Name: draftData.Cust_Name,
                    Address1: draftData.Address1,
                    Address2: draftData.Address2,
                    Address3: draftData.Address3,
                    City: draftData.City,
                    State: draftData.State,
                    PinCode: draftData.Pin_Code,
                    MobileNo: draftData.Mobile_No,
                    PhoneNo: "",
                    DateOfBirth: draftData.DateOf_Birth,
                    EmailID: draftData.email_id,
                    Age: 0,
                    Sex: draftData.Gender,
                    GSTTIN: "",
                    LocalityID: "",
                    StateCode: 0,
                    CountryCode: "",
                    CountryName: "",
                    CreatedDate: draftData.inserted_on,
                    UpdatedDate: "",
                    ObjectStatus: "O",
                    PrivilegeID: "",
                    CustCode: "",
                    CreditLimit: 0,
                    CompanyCode: "",
                    BranchCode: draftData.Branch || "",
                    CustID: 0,
                    ChitCardNo: 0,
                    Religion: "",
                    Profession: "",
                    IsActive: true,
                    Aadharname: "",
                    Panname: "",
                    Locality: "",
                    WeddingAnnivarsaryDate: "",
                    Ismobileverified: 1,
                    Isaadharverified: draftData.IsAadarVerified,
                    Profileimg: draftData.ImageUrl,
                    Documents: documents,
                    Nominee: nomineeDetails,
                    BankDetails: bankdata,
                };

                const postApiUrl = 'https://suvarnagopura.com/CRM/api_db.js/api/Customerdataupload';
                const form = new FormData();

                form.append('documents', JSON.stringify(postRequestBody));

                for (const doc of documents) {
                    if (doc.ImagePath) {
                        try {
                            const imagePath = path.resolve(__dirname, 'images', doc.ImagePath);
                            if (fs.existsSync(imagePath)) {
                                form.append('images', fs.createReadStream(imagePath), path.basename(imagePath));
                            } else {
                                console.warn('Image file not found:', imagePath);
                            }
                        } catch (err) {
                            throw new error(err)
                        }
                    }
                }

                const crmResponse = await axios.post(postApiUrl, form, {
                    headers: form.getHeaders(),
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });

                logResponseBody = JSON.stringify(crmResponse.data);
                crmlogResponseBody = logResponseBody;
                logStatus = 'OK';
            }
        } catch (error) {
            crmlogResponseBody = error.response ? JSON.stringify(error.response.data) : error.message;
            logResponseBody = crmlogResponseBody;
            logStatus = 'Not OK';
        }

        let i = 0;
        insertedTime.setHours(insertedTime.getHours() + 5);
        insertedTime.setMinutes(insertedTime.getMinutes() + 30);

        const logRequest = pool.request();
        logRequest.input('RequestType', sql.VarChar, 'POST');
        logRequest.input('RequestBody', sql.VarChar, externalApiUrl);
        logRequest.input('Status', sql.VarChar, logStatus);
        logRequest.input('ResponseBody', sql.NVarChar, crmlogResponseBody);
        logRequest.input('UpdateOn', sql.DateTime, insertedTime);
        logRequest.input("CustomerMobileNo", sql.VarChar, data.PGlink_id);
        logRequest.input("CRM_ID", sql.Int, 0);
        logRequest.input("RetryCount", sql.Int, i + 1);

        await logRequest.query(`
            INSERT INTO crmlog (RequestType, RequestBody, Status, ResponseBody, UpdateOn, MobileNo, CRM_ID, RetryCount)
            VALUES (@RequestType, @RequestBody, @Status, @ResponseBody, @UpdateOn, @CustomerMobileNo, @CRM_ID, @RetryCount)
        `);

        return res.status(200).json({ externalApiResponse });

    } catch (error) {
        if (transaction) await transaction.rollback();
        return res.status(500).json({ message: error.message });
    }
});

module.exports = router;

