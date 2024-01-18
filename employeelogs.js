
let express = require('express');
const mongo = require("./db.js");
let jsonParser = require('./modules/jsonparser');
let app = express();
const TBL_Employee_Activity_Logs = 'employee_activity_logs';
let EmployeeActivityTb = null;
var from = new Date();
from.setHours(0, 0, 0, 0);
var to = new Date();
to.setHours(23, 59, 59, 999);
app.post('/employeeLoginCount', employeeLoginCount)
async function employeeLoginCount(req, res) {
    try {
        const db = await mongo.happi_discount_connect();
        EmployeeActivityTb = await db.collection(TBL_Employee_Activity_Logs);
        let query = {};
        query.emp_id = req.body.emp_id;
        query.createdDate = {
            "$gte": from,
            "$lte": to
        }
        query.module = req.body.module
        let employeeActivityResponse = await EmployeeActivityTb.findOne(query);
        if (employeeActivityResponse == null) {
            let employeeActivityLog = {
                count: 1,
                page: "Dashboard",
                createdDate: new Date(),
                emp_id: req.body.emp_id,
                "mobile": req.body.mobile,
                "module": req.body.module,
                "updateDate": new Date()
            };
            await EmployeeActivityTb.insertOne(employeeActivityLog);
        }
        else {
            await EmployeeActivityTb.updateOne({ "emp_id": req.body.emp_id, "module": req.body.module }, { $set: { "count": employeeActivityResponse?.count + 1, updateDate: new Date() } })
        }
        return res.json({
            status: true,
            message: "successfull"
        })
    }
    catch (error) {
        console.log("error", error)
        return res.json({
            status: false,
            message: "ERROR"
        })
    }
}


///############################GET Employee LOGS###################################//
app.get('/getEmployeeActivityLogs', getEmployeeActivityLogs);
async function getEmployeeActivityLogs(req, res) {
    try {
        const db = await mongo.happi_discount_connect();
        EmployeeActivityTb = await db.collection(TBL_Employee_Activity_Logs);
        let query = {};
        if (req.query.module != null && req.query.module != "" && req.query.module != undefined && req.query.module != "null") {
            query.module = req.query.module
        }
        if (req.query.emp_id != null && req.query.emp_id != "" && req.query.emp_id != undefined && req.query.emp_id != "null") {
            query.emp_id = { $regex: req.query.emp_id, $options: "si" }
        }
        if (req.query.fromdate != 'all' && req.query.todate != 'all') {
            let fromdate = new Date(req.query.fromdate);
            let todate = new Date(req.query.todate);
            todate.setDate(todate.getDate() + 1);
            query.createdDate = {
                "$gte": fromdate,
                "$lte": todate
            };
        }
        let employeeActivityLogsResponse = await EmployeeActivityTb.find(query).sort({ "createdDate": -1 }).toArray();
        return res.json({
            status: true,
            data: employeeActivityLogsResponse
        })
    }
    catch (error) {
        console.log("error", error);
        return res.json({
            status: false,
            message: "error"
        })
    }

}

///############################### GET EMPLOYEE LOGS DOWNLOAD#############################//
app.get('/employeeActivityLogsDownload', employeeActivityLogsDownload)
async function employeeActivityLogsDownload(req, res) {
    try {
        const db = await mongo.happi_discount_connect();
        EmployeeActivityTb = await db.collection(TBL_Employee_Activity_Logs);
        let query = {};
        if (req.query.module != null && req.query.module != "" && req.query.module != undefined && req.query.module != "null") {
            query.module = req.query.module
        }
        if (req.query.emp_id != null && req.query.emp_id != "" && req.query.emp_id != undefined && req.query.emp_id != "null") {
            query.emp_id = { $regex: req.query.emp_id, $options: "si" }
        }
        if (req.query.fromdate != 'all' && req.query.todate != 'all') {
            let fromdate = new Date(req.query.fromdate);
            let todate = new Date(req.query.todate);
            todate.setDate(todate.getDate() + 1);
            query.createdDate = {
                "$gte": fromdate,
                "$lte": todate
            };
        }
        let employeeActivityLogsResponse = await EmployeeActivityTb.find(query).sort({ "createdDate": -1 }).toArray();
        if (employeeActivityLogsResponse.length > 0) {
            await jsonParser.DownloadCSV(employeeActivityLogsResponse, res);
        } else {
            return res.json({
                status: false,
                message: "NO DATA FOUND"
            })
        }

    }
    catch (error) {
        console.log("error", error);
        return res.json({
            status: false,
            message: "error"
        })
    }

}

module.exports = app