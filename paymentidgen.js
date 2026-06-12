const express = require("express");
const { poolPromise, sql } = require("./db");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      CustomerName,
      CustomerMobileNo,
      CustomerEmail,
      BankAccountNo,
      IFSCCode,
      link_purpose,
      PGProvider,
      InstAmt,
      TxnDate,
      TxnCurrrency,
      TxnStatus,
      request_status,
      pg_sessionId,
      PGTxnRefNo,
      PGPayMode,
      PayModeTxnResponse,
      DraftID
    } = req.body;


    const Request_Body = JSON.stringify(req.body);

    const insertedTime = new Date();
    insertedTime.setHours(insertedTime.getHours() + 5);
    insertedTime.setMinutes(insertedTime.getMinutes() + 30);

    const PGlink_id = Date.now().toString();

    const pool = await poolPromise;

    // 🔍 Check if record exists
    const checkRequest = pool.request();
    checkRequest.input("DraftID", sql.Int, DraftID);
    checkRequest.input("CustomerName", sql.VarChar, CustomerName || null);
    checkRequest.input("CustomerMobileNo", sql.VarChar, CustomerMobileNo || null);

    const checkResult = await checkRequest.query(
      `SELECT TOP 1 * 
       FROM DraftEnrollmentPaymentLog
       WHERE DraftID = @DraftID 
         AND CustomerName = @CustomerName 
         AND CustomerMobileNo = @CustomerMobileNo
       ORDER BY InsertedOn DESC`
    );

    const exists = checkResult.recordset.length > 0;

    if (!exists || (TxnStatus && TxnStatus.toUpperCase() === "SUCCESS")) {
      // ✅ Insert new row
      const insertRequest = pool.request();
      insertRequest.input("DraftID", sql.Int, DraftID);
      insertRequest.input("CustomerName", sql.VarChar, CustomerName || null);
      insertRequest.input("CustomerMobileNo", sql.VarChar, CustomerMobileNo || null);
      insertRequest.input("CustomerEmail", sql.VarChar, CustomerEmail || null);
      insertRequest.input("BankAccountNo", sql.VarChar, BankAccountNo || null);
      insertRequest.input("IFSCCode", sql.VarChar, IFSCCode || null);
      insertRequest.input("link_purpose", sql.VarChar, link_purpose || null);
      insertRequest.input("PGProvider", sql.VarChar, PGProvider || null);
      insertRequest.input("InstAmt", sql.Decimal, InstAmt || null);
      insertRequest.input("TxnDate", sql.DateTime, TxnDate || null);
      insertRequest.input("TxnCurrrency", sql.VarChar, TxnCurrrency || null);
      insertRequest.input("TxnStatus", sql.VarChar, TxnStatus || null);
      insertRequest.input("Request_Body", sql.NVarChar, Request_Body);
      insertRequest.input("request_status", sql.VarChar, request_status || null);
      insertRequest.input("pg_sessionId", sql.NVarChar, pg_sessionId || null);
      insertRequest.input("PGTxnRefNo", sql.VarChar, PGTxnRefNo || null);
      insertRequest.input("PGPayMode", sql.VarChar, PGPayMode || null);
      insertRequest.input("PayModeTxnResponse", sql.VarChar, PayModeTxnResponse || null);
      insertRequest.input("PGlink_id", sql.VarChar, PGlink_id);
      insertRequest.input("InsertedOn", sql.DateTime, insertedTime);

      await insertRequest.query(
        `INSERT INTO DraftEnrollmentPaymentLog (
          DraftID, CustomerName, CustomerMobileNo, CustomerEmail, BankAccountNo, IFSCCode, link_purpose, PGProvider, InstAmt,
          TxnDate, TxnCurrrency, TxnStatus, Request_Body, request_status, pg_sessionId, PGTxnRefNo, PGPayMode,
          PayModeTxnResponse, PGlink_id, InsertedOn
        ) VALUES (
          @DraftID, @CustomerName, @CustomerMobileNo, @CustomerEmail, @BankAccountNo, @IFSCCode, @link_purpose, @PGProvider, @InstAmt,
          @TxnDate, @TxnCurrrency, @TxnStatus, @Request_Body, @request_status, @pg_sessionId, @PGTxnRefNo, @PGPayMode,
          @PayModeTxnResponse, @PGlink_id, @InsertedOn
        )`
      );

      // 🔁 Update DraftEnrollment with new PGlink_ID
      const updateDraftReq = pool.request();
      updateDraftReq.input("dfPGlink_ID", sql.VarChar, PGlink_id);
      updateDraftReq.input("dfDraftID", sql.Int, DraftID || null);
      updateDraftReq.input("CustomerName", sql.VarChar, CustomerName || null);
      updateDraftReq.input("CustomerMobileNo", sql.VarChar, CustomerMobileNo || null);

      await updateDraftReq.query(
        `UPDATE DraftEnrollment
         SET PGlink_ID = @dfPGlink_ID
         WHERE Cust_Name = @CustomerName AND Mobile_No = @CustomerMobileNo AND ID = @dfDraftID`
      );

      return res.status(200).json({
        message: !exists
          ? "New record inserted (no existing record)"
          : "Payment SUCCESS → New record inserted",
        PGlink_id,
      });
    } else {
      // ✅ Update existing (NOT SUCCESS case)
      const updateReq = pool.request();
      updateReq.input("DraftID", sql.Int, DraftID);
      updateReq.input("CustomerName", sql.VarChar, CustomerName || null);
      updateReq.input("CustomerMobileNo", sql.VarChar, CustomerMobileNo || null);
      updateReq.input("CustomerEmail", sql.VarChar, CustomerEmail || null);
      updateReq.input("BankAccountNo", sql.VarChar, BankAccountNo || null);
      updateReq.input("IFSCCode", sql.VarChar, IFSCCode || null);
      updateReq.input("link_purpose", sql.VarChar, link_purpose || null);
      updateReq.input("PGProvider", sql.VarChar, PGProvider || null);
      updateReq.input("InstAmt", sql.Decimal, InstAmt || null);
      updateReq.input("TxnDate", sql.DateTime, TxnDate || null);
      updateReq.input("TxnCurrrency", sql.VarChar, TxnCurrrency || null);
      updateReq.input("TxnStatus", sql.VarChar, TxnStatus || null);
      updateReq.input("Request_Body", sql.NVarChar, Request_Body);
      updateReq.input("request_status", sql.VarChar, request_status || null);
      updateReq.input("pg_sessionId", sql.NVarChar, pg_sessionId || null);
      updateReq.input("PGTxnRefNo", sql.VarChar, PGTxnRefNo || null);
      updateReq.input("PGPayMode", sql.VarChar, PGPayMode || null);
      updateReq.input("PayModeTxnResponse", sql.VarChar, PayModeTxnResponse || null);
      updateReq.input("PGlink_id", sql.VarChar, PGlink_id);

      await updateReq.query(
        `UPDATE DraftEnrollmentPaymentLog
         SET CustomerEmail=@CustomerEmail,
             BankAccountNo=@BankAccountNo,
             IFSCCode=@IFSCCode,
             link_purpose=@link_purpose,
             PGProvider=@PGProvider,
             InstAmt=@InstAmt,
             TxnDate=@TxnDate,
             TxnCurrrency=@TxnCurrrency,
             TxnStatus=@TxnStatus,
             Request_Body=@Request_Body,
             request_status=@request_status,
             pg_sessionId=@pg_sessionId,
             PGTxnRefNo=@PGTxnRefNo,
             PGPayMode=@PGPayMode,
             PayModeTxnResponse=@PayModeTxnResponse,
             PGlink_id=@PGlink_id
         WHERE DraftID=@DraftID 
           AND CustomerName=@CustomerName 
           AND CustomerMobileNo=@CustomerMobileNo`
      );

      // 🔁 Still update DraftEnrollment with latest PGlink_ID
      const updateDraftReq = pool.request();
      updateDraftReq.input("dfPGlink_ID", sql.VarChar, PGlink_id);
      updateDraftReq.input("dfDraftID", sql.Int, DraftID || null);
      updateDraftReq.input("CustomerName", sql.VarChar, CustomerName || null);
      updateDraftReq.input("CustomerMobileNo", sql.VarChar, CustomerMobileNo || null);

      await updateDraftReq.query(
        `UPDATE DraftEnrollment
         SET PGlink_ID = @dfPGlink_ID
         WHERE Cust_Name = @CustomerName AND Mobile_No = @CustomerMobileNo AND ID = @dfDraftID`
      );

      return res.status(200).json({
        message: "Payment NOT SUCCESS → Existing record updated",
        PGlink_id,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
