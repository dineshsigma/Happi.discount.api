let express = require('express');
const mongo = require("../../db.js");
let app = express();
const { ObjectId } = require('mongodb');
const TBL_Special_Approver = 'discount_special_approver';
const TBL_Employee_management = 'discount_employee_management';
let Discount_Special_Approver = null;
let Employee_managemntTb = null;

//--------------------------create Special Approvals--------------------------------//
app.post('/createSpecialApprover', createSpecialApprover);
async function createSpecialApprover(req, res) {
    try {
        let data = req.body;
        const db = await mongo.happi_discount_connect();
        Discount_Special_Approver = await db.collection(TBL_Special_Approver);
        Employee_managemntTb = await db.collection(TBL_Employee_management);
        let employeeResponse = await Employee_managemntTb.findOne({ _id: new ObjectId(data.id) });
        let discountApproverResponse = await Discount_Special_Approver.findOne({ "name": employeeResponse?.name });
        if (discountApproverResponse != null) {
            return res.json({
                status: true,
                message: "Employee Already Addedd"
            })
        }
        delete employeeResponse?._id
        await Discount_Special_Approver.insertOne(employeeResponse);
        return res.json({
            status: true,
            message: "Special Approvals Created Successfully"
        })
    }
    catch (error) {
        return res.json({
            status: false,
            message: "error"
        })
    }
}

module.exports = app