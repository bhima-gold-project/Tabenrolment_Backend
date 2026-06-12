const crypto = require('crypto');
const express = require('express');
const { poolPromise, sql } = require('./db');
const router = express.Router();
const axios = require('axios'); // Import axios for making HTTP requests


router.get('/:PGLinkID', async (req, res) => {
    try {
        const { PGLinkID } = req.params;
        if (!PGLinkID) {
            return res.status(400).json({ message: "PGLinkID is required" });
        }

        const pool = await poolPromise;
        const request = pool.request();
        request.input("PGLinkID", sql.VarChar, PGLinkID);

        const result = await request.query(`
            SELECT ResponseBody 
            FROM crmlog 
            WHERE MobileNo = @PGLinkID 
            ORDER BY UpdateOn ASC
        `);

        if (result.recordset.length > 0) {
            // Parse and filter
            const validResponse = result.recordset
                .map(r => {
                    try {
                        return JSON.parse(r.ResponseBody);
                    } catch {
                        return null;
                    }
                })
                .filter(r => r && r.ReceiptNo && r.ReceiptNo != 0)[0]; // ✅ ReceiptNo with capital R

            if (validResponse) {
                return res.status(200).json({ response: validResponse });
            } else {
                return res.status(404).json({ message: "No valid response found (ReceiptNo != 0)" });
            }
        } else {
            res.status(404).json({ message: "No response found for this mobile number" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



module.exports = router;