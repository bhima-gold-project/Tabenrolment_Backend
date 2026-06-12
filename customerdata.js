const express = require('express');
const router = express.Router();
const cors = require('cors');
const { poolPromise, sql } = require("./db");

router.use(cors());

router.get('/', async (req, res) => {
  const { DraftID } = req.query;

  if (!DraftID) {
    return res.status(400).send({ message: 'DraftID is required.' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input('DraftID', sql.VarChar, DraftID)
      .query(
        `SELECT * FROM DraftEnrollment df
         INNER JOIN DraftCustomerDocuments dfc
         ON df.ID = dfc.DraftID
         WHERE df.ID = @DraftID`
      );

    if (result.recordset.length > 0) {
      const data = result.recordset;

      // ** Fix for Duplicate Customer Images **
      const customerImages = [];
      const uniqueImages = new Set();

      data.forEach(entry => {
        if (!uniqueImages.has(entry.ImageUrl)) {
          uniqueImages.add(entry.ImageUrl);
          customerImages.push({ ImageUrl: entry.ImageUrl });
        }
      });

      // Structuring response
      const response = {
        customerDetails: {
          Cust_Name: data[0].Cust_Name,
          Gender: data[0].Gender,
          Address: [data[0].Address1, data[0].Address2, data[0].Address3].filter(Boolean).join(", "),
          Locality: data[0].Locality,
          City: data[0].City,
          State: data[0].State,
          Pin_Code: data[0].Pin_Code,
          Mobile_No: data[0].Mobile_No,
          Email_ID: data[0].email_id,
          DateOf_Birth: data[0].DateOf_Birth,
        },
        customerImages, 
        nominee: {
          Name: data[0].NomineName,
          Relationship: data[0].NomineRelationship,
          Address: data[0].NomineAddress,
          Phone: data[0].NominePhone
        },
        guardian: {
          Name: data[0].GuardianName,
          Relation: data[0].GuardianRelation,
          Gender: data[0].Guardiangender,
          DOB: data[0].GuardianDOB
        },
        BankDetails: {
          AccountNo: data[0].Accountno,
          IFSC: data[0].ifsccode,
        },
        scheme: {
          Scheme: data[0].Scheme,
          InstallmentAmount: data[0].InstallmentAmount,
          IsMembershipCreated: data[0].IsMembershipCreated,
          MembershipNo: data[0].MembershipNo,
          PGlink_ID: data[0].PGlink_ID,
          TxnStatus: data[0].TxnStatus,
          DraftID: data[0].DraftID,
          Branch_code: data[0].Branch_code
        },
        documents: data.map(entry => ({
          DocumentTypeID: entry.DocumentTypeID,
          Description: entry.DocumentDecription,
          ImageURL: entry.ImageURL
        }))
      };

      return res.status(200).send(response);
    } else {
      return res.status(404).send({ message: 'No data found' });
    }
  } catch (err) {
    return res.status(500).send({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
