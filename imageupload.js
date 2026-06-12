
//-------------------------------------2025-08-24-----------------------------------------------
const express = require("express");
const fs = require("fs");
const path = require("path");
const { poolPromise, sql } = require("./db");
require('dotenv').config();

const router = express.Router();

// Set JSON body parsing with increased limit
router.use(express.json({ limit: "50mb" }));
const baseUrl = process.env.DOC_BASE_URL;

// Route to insert data into DraftEnrollment table
router.post("/", async (req, res) => {
  try {
    const {
      Cust_ID,
      Accountno,
      Address1,
      Address2,
      Address3,
      Branch,
      City,
      Cust_Name,
      DateOf_Birth,
      Gender,
      Mobile_No,
      NomineName,
      NomineRelationship,
      Pin_Code,
      Scheme,
      State,
      email_id,
      imageUrl,
      Locality,
      InstallmentAmount,
      NomineAddress,
      NominePhone,
      ifsccode,
      GuardianDOB,
      GuardianName,
      GuardianRelation,
      Guardiangender,
      IsAadarVerified,
      IsMembershipCreated,
      cancelledOn,
      CancelledBy,
      TnxType,
      IsCancelFlag,
      inserted_By,
      AadharNo,
      documents // Expecting an array of documents
    } = req.body;

    if (!Mobile_No) {
      return res.status(400).json({ error: "Mobile Number is required." });
    }
    if (!Cust_Name) {
      return res.status(400).json({ error: "Customer Name is required." });
    }

    const baseDir = process.env.BASE_DIR;
    const currentYear = new Date().getFullYear();
    const currentMonth = (`0${new Date().getMonth() + 1}`).slice(-2);
    const branchDir = path.join(baseDir, currentYear.toString(), currentMonth, Branch || "default");

    // Ensure directories for images and documents
    const imageDir = path.join(branchDir, "images");
    const docDir = path.join(branchDir, "documents");
    fs.mkdirSync(imageDir, { recursive: true });
    fs.mkdirSync(docDir, { recursive: true });

    // Save image if provided
    let relativeImageUrl = null;
    if (imageUrl) {
      const imageName = `${Date.now()}.jpg`;
      const imagePath = path.join(imageDir, imageName);
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(imagePath, buffer);
      relativeImageUrl = `${process.env.IMAGE_URL}/${currentYear}/${currentMonth}/${Branch}/images/${imageName}`;
    }

    const formattedGender = Gender === "Female" ? "F" : Gender === "Male" ? "M" : null;

    const insertedTime = new Date();
    insertedTime.setHours(insertedTime.getHours() + 5);
    insertedTime.setMinutes(insertedTime.getMinutes() + 30);

    const pool = await poolPromise;
    const request = pool.request();
    request.input("Cust_Name", sql.NVarChar, Cust_Name);
    request.input("Mobile_No", sql.VarChar, Mobile_No);
    request.input("Scheme", sql.NVarChar, Scheme);
    request.input("InstallmentAmount", sql.Decimal, InstallmentAmount);
    request.input("Address1", sql.NVarChar, Address1);
    request.input("Branch", sql.NVarChar, Branch);
    request.input("City", sql.NVarChar, City);
    request.input("State", sql.NVarChar, State);
    request.input("Pin_Code", sql.VarChar, Pin_Code);
    request.input("email_id", sql.VarChar, email_id);
    request.input("DateOf_Birth", sql.Date, DateOf_Birth);
    request.input("NomineName", sql.NVarChar, NomineName);
    request.input("NomineRelationship", sql.NVarChar, NomineRelationship);
    request.input("NomineAddress", sql.NVarChar, NomineAddress);
    request.input("NominePhone", sql.NVarChar, NominePhone);
    request.input("Accountno", sql.VarChar, Accountno || null);
    request.input("ifsccode", sql.NVarChar, ifsccode || null);
    request.input("GuardianName", sql.NVarChar, GuardianName || null);
    request.input("GuardianRelation", sql.NVarChar, GuardianRelation || null);
    request.input("Guardiangender", sql.NVarChar, Guardiangender || null);
    request.input("GuardianDOB", sql.DateTime, GuardianDOB || null);
    request.input("IsMembershipCreated", sql.NVarChar, IsMembershipCreated);
    request.input("IsCancelFlag", sql.NVarChar, IsCancelFlag);
    request.input("cancelledOn", sql.DateTime, cancelledOn);
    request.input("CancelledBy", sql.NVarChar, CancelledBy);
    request.input("IsAadarVerified", sql.Bit, IsAadarVerified);
    request.input("ImageUrl", sql.VarChar, relativeImageUrl || null);
    request.input("TxnType", sql.VarChar, TnxType || null);
    request.input("Gender", sql.VarChar, formattedGender || null);
    request.input("Address2", sql.VarChar, Address2 || null);
    request.input("Address3", sql.VarChar, Address3 || null);
    request.input("inserted_on", sql.DateTime, insertedTime);
    request.input("inserted_By", sql.VarChar, inserted_By || null);
    request.input("Locality", sql.VarChar, Locality || null);
    request.input("AadharNo", sql.VarChar, AadharNo || null);

    // Check if record exists
    const checkQuery = `
      SELECT TOP 1 ID, IsMembershipCreated 
      FROM DraftEnrollment
      WHERE Cust_Name = @Cust_Name 
        AND Mobile_No = @Mobile_No 
       AND Address1 = @Address1
        AND Branch = @Branch ORDER BY inserted_on DESC
    `;

    const checkResult = await request.query(checkQuery);
    let DraftID;

    if (checkResult.recordset.length > 0) {
      DraftID = checkResult.recordset[0].ID;
      const existingMembership = checkResult.recordset[0].IsMembershipCreated;

      if (existingMembership === "N") {
        // Update existing record
        const updateReq = pool.request();
        updateReq.input("DraftID", sql.Int, DraftID);
        updateReq.input("Branch", sql.NVarChar, Branch);
        updateReq.input("City", sql.NVarChar, City);
        updateReq.input("State", sql.NVarChar, State);
        updateReq.input("Pin_Code", sql.VarChar, Pin_Code);
        updateReq.input("email_id", sql.VarChar, email_id);
        updateReq.input("DateOf_Birth", sql.Date, DateOf_Birth);
        updateReq.input("NomineName", sql.NVarChar, NomineName);
        updateReq.input("NomineRelationship", sql.NVarChar, NomineRelationship);
        updateReq.input("NomineAddress", sql.NVarChar, NomineAddress);
        updateReq.input("NominePhone", sql.NVarChar, NominePhone);
        updateReq.input("Accountno", sql.VarChar, Accountno || null);
        updateReq.input("ifsccode", sql.NVarChar, ifsccode || null);
        updateReq.input("GuardianName", sql.NVarChar, GuardianName || null);
        updateReq.input("GuardianRelation", sql.NVarChar, GuardianRelation || null);
        updateReq.input("Guardiangender", sql.NVarChar, Guardiangender || null);
        updateReq.input("GuardianDOB", sql.DateTime, GuardianDOB || null);
        updateReq.input("IsMembershipCreated", sql.NVarChar, IsMembershipCreated);
        updateReq.input("IsCancelFlag", sql.NVarChar, IsCancelFlag);
        updateReq.input("cancelledOn", sql.DateTime, cancelledOn);
        updateReq.input("CancelledBy", sql.NVarChar, CancelledBy);
        updateReq.input("IsAadarVerified", sql.Bit, IsAadarVerified);
        updateReq.input("ImageUrl", sql.VarChar, relativeImageUrl || null);
        updateReq.input("TxnType", sql.VarChar, TnxType || null);
        updateReq.input("Gender", sql.VarChar, formattedGender || null);
        updateReq.input("Address2", sql.VarChar, Address2 || null);
        updateReq.input("Address3", sql.VarChar, Address3 || null);
        updateReq.input("inserted_on", sql.DateTime, insertedTime);
        updateReq.input("inserted_By", sql.VarChar, inserted_By || null);
        updateReq.input("Locality", sql.VarChar, Locality || null);
        updateReq.input("AadharNo", sql.VarChar, AadharNo || null);
       updateReq.input("Scheme", sql.NVarChar, Scheme);
      updateReq.input("InstallmentAmount", sql.Decimal, InstallmentAmount);

        await updateReq.query(`
          UPDATE DraftEnrollment SET
            Branch = @Branch, City = @City, State = @State, Pin_Code = @Pin_Code,
            email_id = @email_id, DateOf_Birth = @DateOf_Birth, NomineName = @NomineName,
            NomineRelationship = @NomineRelationship, NomineAddress = @NomineAddress,
            NominePhone = @NominePhone, Accountno = @Accountno, ifsccode = @ifsccode,
            GuardianName = @GuardianName, GuardianRelation = @GuardianRelation,
            Guardiangender = @Guardiangender, GuardianDOB = @GuardianDOB,
            IsMembershipCreated = @IsMembershipCreated, IsCancelFlag = @IsCancelFlag,
            cancelledOn = @cancelledOn, CancelledBy = @CancelledBy,
            IsAadarVerified = @IsAadarVerified, ImageUrl = @ImageUrl, TxnType = @TxnType,
            Gender = @Gender, Address2 = @Address2, Address3 = @Address3,
            inserted_on = @inserted_on, inserted_By = @inserted_By,
            Locality = @Locality, AadharNo = @AadharNo , Scheme = @Scheme , InstallmentAmount = @InstallmentAmount
          WHERE ID = @DraftID;
        `);
      } else {
        // Membership already created → Insert new row
        const insertResult = await request.query(`
          INSERT INTO DraftEnrollment (
            Cust_Name, Mobile_No, Scheme, InstallmentAmount, Address1, Branch, City, State, Pin_Code, email_id,
            DateOf_Birth, NomineName, NomineRelationship, NomineAddress, NominePhone, Accountno, ifsccode,
            GuardianName, GuardianRelation, Guardiangender, GuardianDOB, IsMembershipCreated, IsCancelFlag,
            cancelledOn, CancelledBy, IsAadarVerified, ImageUrl, TxnType, Gender, Address2, Address3,
            inserted_on, inserted_By, Locality, AadharNo
          ) OUTPUT INSERTED.ID VALUES (
            @Cust_Name, @Mobile_No, @Scheme, @InstallmentAmount, @Address1, @Branch, @City, @State, @Pin_Code, @email_id,
            @DateOf_Birth, @NomineName, @NomineRelationship, @NomineAddress, @NominePhone, @Accountno, @ifsccode,
            @GuardianName, @GuardianRelation, @Guardiangender, @GuardianDOB, @IsMembershipCreated, @IsCancelFlag,
            @cancelledOn, @CancelledBy, @IsAadarVerified, @ImageUrl, @TxnType, @Gender, @Address2, @Address3,
            @inserted_on, @inserted_By, @Locality, @AadharNo
          );
        `);
        DraftID = insertResult.recordset[0].ID;
      }
    } else {
      // No record → Insert new
      const insertResult = await request.query(`
        INSERT INTO DraftEnrollment (
          Cust_Name, Mobile_No, Scheme, InstallmentAmount, Address1, Branch, City, State, Pin_Code, email_id,
          DateOf_Birth, NomineName, NomineRelationship, NomineAddress, NominePhone, Accountno, ifsccode,
          GuardianName, GuardianRelation, Guardiangender, GuardianDOB, IsMembershipCreated, IsCancelFlag,
          cancelledOn, CancelledBy, IsAadarVerified, ImageUrl, TxnType, Gender, Address2, Address3,
          inserted_on, inserted_By, Locality, AadharNo
        ) OUTPUT INSERTED.ID VALUES (
          @Cust_Name, @Mobile_No, @Scheme, @InstallmentAmount, @Address1, @Branch, @City, @State, @Pin_Code, @email_id,
          @DateOf_Birth, @NomineName, @NomineRelationship, @NomineAddress, @NominePhone, @Accountno, @ifsccode,
          @GuardianName, @GuardianRelation, @Guardiangender, @GuardianDOB, @IsMembershipCreated, @IsCancelFlag,
          @cancelledOn, @CancelledBy, @IsAadarVerified, @ImageUrl, @TxnType, @Gender, @Address2, @Address3,
          @inserted_on, @inserted_By, @Locality, @AadharNo
        );
      `);
      DraftID = insertResult.recordset[0].ID;
    }

    // Save documents
    // if (documents && documents.length > 0) {
    //   for (const doc of documents) {
    //     if (doc.imagePath && doc.documentTypeId) {
    //       const docExt = doc.imagePath.startsWith("data:application/pdf;") ? "pdf" : "jpg";
    //       const docFileName = `${Date.now()}_${doc.documentTypeId}.${docExt}`;
    //       const docPath = path.join(docDir, docFileName);
    //       const base64DocData = doc.imagePath.replace(/^data:.*;base64,/, "");
    //       const docBuffer = Buffer.from(base64DocData, "base64");
    //       fs.writeFileSync(docPath, docBuffer);

    //       const docUrl = `${process.env.IMAGE_URL}/${currentYear}/${currentMonth}/${Branch}/documents/${docFileName}`;
    //       const documentNo = doc.documentNo;

    //       const docRequest = pool.request();
    //       docRequest.input("DraftID", sql.Int, DraftID);
    //       docRequest.input("Branch_Code", sql.NVarChar, Branch);
    //       docRequest.input("DocMobileNo", sql.NVarChar, Mobile_No);
    //       docRequest.input("DocumentTypeID", sql.Int, doc.documentTypeId);
    //       docRequest.input("DocumentDecription", sql.NVarChar, documentNo);
    //       docRequest.input("DocImageURL", sql.NVarChar, docUrl);
    //       docRequest.input("IsActive", sql.Bit, 1);
    //       docRequest.input("docinserted_on", sql.DateTime, insertedTime);
    //       docRequest.input("docinserted_by", sql.NVarChar, 'BR');

    //       await docRequest.query(`
    //         INSERT INTO DraftCustomerDocuments (
    //           DraftID, Branch_Code, MobileNo, DocumentTypeID, DocumentDecription, ImageURL, IsActive,
    //           Inserted_On, inserted_by
    //         ) VALUES (
    //           @DraftID, @Branch_Code, @DocMobileNo, @DocumentTypeID, @DocumentDecription, @DocImageURL, @IsActive,
    //           @docinserted_on, @docinserted_by
    //         )
    //       `);
    //     }
    //   }
    // }



    if (documents && documents.length > 0) {
  for (const doc of documents) {
    if (doc.imagePath && doc.documentTypeId) {
      const docExt = doc.imagePath.startsWith("data:application/pdf;") ? "pdf" : "jpg";
      const docFileName = `${Date.now()}_${doc.documentTypeId}.${docExt}`;
      const docPath = path.join(docDir, docFileName);
      const base64DocData = doc.imagePath.replace(/^data:.*;base64,/, "");
      const docBuffer = Buffer.from(base64DocData, "base64");
      fs.writeFileSync(docPath, docBuffer);

      const docUrl = `${process.env.IMAGE_URL}/${currentYear}/${currentMonth}/${Branch}/documents/${docFileName}`;
      const documentNo = doc.documentNo;

      // create request
      const docRequest = pool.request();
      docRequest.input("DraftID", sql.Int, DraftID);
      docRequest.input("Branch_Code", sql.NVarChar, Branch);
      docRequest.input("DocMobileNo", sql.NVarChar, Mobile_No);
      docRequest.input("DocumentTypeID", sql.Int, doc.documentTypeId);
      docRequest.input("DocumentDecription", sql.NVarChar, documentNo);
      docRequest.input("DocImageURL", sql.NVarChar, docUrl);
      docRequest.input("IsActive", sql.Bit, 1);
      docRequest.input("docinserted_on", sql.DateTime, insertedTime);
      docRequest.input("docinserted_by", sql.NVarChar, 'BR');

      // 🔎 First check if record already exists
      const check = await docRequest.query(`
        SELECT 1 FROM DraftCustomerDocuments
        WHERE DraftID = @DraftID 
          AND MobileNo = @DocMobileNo 
          AND DocumentTypeID = @DocumentTypeID 
          AND DocumentDecription = @DocumentDecription
      `);

      if (check.recordset.length === 0) {
        // ✅ Insert only if not exists
        await docRequest.query(`
          INSERT INTO DraftCustomerDocuments (
            DraftID, Branch_Code, MobileNo, DocumentTypeID, DocumentDecription, ImageURL, IsActive,
            Inserted_On, inserted_by
          ) VALUES (
            @DraftID, @Branch_Code, @DocMobileNo, @DocumentTypeID, @DocumentDecription, @DocImageURL, @IsActive,
            @docinserted_on, @docinserted_by
          )
        `);
      } else {
        console.log(`Document already exists for DraftID=${DraftID}, MobileNo=${Mobile_No}, DocumentTypeID=${doc.documentTypeId}`);
      }
    }
  }
}


    res.status(200).json({
      message: "Data processed successfully",
      DraftID,
      imageUrl: relativeImageUrl,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
