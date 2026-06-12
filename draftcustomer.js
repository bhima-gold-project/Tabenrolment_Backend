const express = require('express');
const { poolPromise, sql } = require('./db');
const router = express.Router();

router.get('/:DraftID', async (req, res) => {
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
});

module.exports = router;
