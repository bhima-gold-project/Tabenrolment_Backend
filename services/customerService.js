const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require("../db");

const customerService = async (req, res) => {
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
}

///////////////////DRAFT CUSTOMER //////////////////////////////////

const draftCustomerService =  async (req, res) => {
    try {
        const { DraftID } = req.params;
        if (!DraftID) {
            return res.status(400).json({ message: "DraftID is required" });
        }

        const pool = await poolPromise;
        const request = pool.request();
        request.input("DraftID", sql.VarChar, DraftID);

        // Fetch DraftEnrollment data (including nominee and bank details)
        const draftResult = await request.query(`
            SELECT * FROM DraftEnrollment
            WHERE ID = @DraftID
        `);

        // Fetch DraftCustomerDocuments data
        const documentResult = await request.query(`
            SELECT * FROM DraftCustomerDocuments
            WHERE DraftID = @DraftID
        `);

        if (draftResult.recordset.length > 0) {
            const draftEnrollment = draftResult.recordset[0];

            // ✅ Convert IsAadarVerified to 1 or 0
            draftEnrollment.IsAadarVerified = draftEnrollment.IsAadarVerified ? 1 : 0;

            // Attach document data as an array
            draftEnrollment.document = documentResult.recordset;

            // Attach nominee details from DraftEnrollment table
            draftEnrollment.NomineeDetails = [{
                NomineRelationship: draftEnrollment.NomineRelationship,
                NomineName: draftEnrollment.NomineName,
                NomineAddress: draftEnrollment.NomineAddress,
                NominePhone: draftEnrollment.NominePhone,
                IsActive: draftEnrollment.NomineeIsActive
            }];

            // Attach bank details from DraftEnrollment table
            draftEnrollment.CustomerBankDetails = [{
                ifsccode: draftEnrollment.ifsccode,
                Accountno: draftEnrollment.Accountno,
                IsActive: draftEnrollment.BankIsActive
            }];

            // Clean up duplicate fields
            delete draftEnrollment.NomineRelationship;
            delete draftEnrollment.NomineName;
            delete draftEnrollment.NomineAddress;
            delete draftEnrollment.NominePhone;
            delete draftEnrollment.NomineeIsActive;
            delete draftEnrollment.ifsccode;
            delete draftEnrollment.Accountno;
            delete draftEnrollment.BankIsActive;

            res.json({ draftEnrollment });
        } else {
            res.status(404).json({ message: "No response found for this DraftID" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {customerService,draftCustomerService}
