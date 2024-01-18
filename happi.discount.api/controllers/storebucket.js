let express = require('express');
let app = express()
const mongo = require("../../db.js");
let jsonParser = require('../../modules/jsonparser');
let logsService = require('../../logservice.js');
const { v4: uuidv4 } = require('uuid');
const TBL_Store_Bucket = 'discount_bucket';
let StoreBucketTb = null;
//#### Download Sample Document for Store Bucket As CSV format ########################//
app.get('/sampleDocumentForStoreBucket', sampleDocumentForStoreBucket)
async function sampleDocumentForStoreBucket(req, res) {
    try {
        let data = [
            {
                "store_code": "",
                "store_name": "",
                "amount": ""
            }
        ]
        if (data.length > 0) {
            await jsonParser.DownloadCSV(data, res);
        } else {
            return res.json({
                status: false,
                message: "NO DATA FOUND"
            })
        }
    }
    catch (error) {
        logsService.log('error', req, error + "")
        return res.json({
            status: false,
            message: "ERROR"
        })
    }
}
//######## Upload Store Details  as CSV format#############
app.post('/uploadStoreBucketData', uploadStoreBucketData)
async function uploadStoreBucketData(req, res) {
    try {
        let storearray = [];
        let ErrorData = [];
        let successData = [];
        const db = await mongo.happi_discount_connect();
        StoreBucketTb = await db.collection(TBL_Store_Bucket);
        if (req.body.storeData == null || req.body.storeData == undefined || req.body.storeData == "null" || req.body.storeData == "") {
            return res.json({
                status: false,
                message: "Please Upload Valid CSV"
            })
        }
        for (let i = 0; i < req.body.storeData.length; i++) {
            let checkstore_name = await StoreBucketTb.findOne({ "store_name": req.body.storeData[i]?.store_name.toUpperCase() });
            // console.log("checkstore_name", checkstore_name)
            if (checkstore_name != null) {
                ErrorData.push({
                    store_name: req.body.storeData[i]?.store_name,
                    msg: "Already Exist"
                })
                await StoreBucketTb.updateOne({ "store_name": req.body.storeData[i]?.store_name.toUpperCase() }, { $set: { "store_code": req.body.storeData[i]?.store_code, "amount": parseInt(req.body.storeData[i]?.amount), status: true, "end_date": checkstore_name?.end_date, "start_date": checkstore_name?.start_date } })
            }
            else {
                successData.push({
                    store_name: req.body.storeData[i]?.store_name?.toUpperCase(),
                    msg: "Saved"
                })
                storearray.push({
                    "store_code": req.body.storeData[i]?.store_code,
                    "store_name": req.body.storeData[i]?.store_name?.toUpperCase(),
                    "amount": parseInt(req.body.storeData[i]?.amount),
                    "status": true,
                    "start_date": new Date(),
                    "end_date": new Date(),
                    "id": uuidv4()
                })
            }
        }
        if (storearray.length != 0) {
            await StoreBucketTb.insertMany(storearray)//insert  multiple records for store bucket Details 
            return res.json({
                status: true,
                message: "Store bucket Details saved successfully",
                success: successData,
                error: ErrorData
            })
        }
        else {
            return res.json({
                status: true,
                message: "Store bucket Details saved successfully"
            })
        }
    }
    catch (error) {
        console.log("error", error)
        return res.json({
            status: false,
            message: "ERROR"
        })
    }
}

///#### Export CSV for sample Data
app.get('/exportStoreBucketData', exportStoreBucketData);
async function exportStoreBucketData(req, res) {
    try {
        const db = await mongo.happi_discount_connect();
        StoreBucketTb = await db.collection(TBL_Store_Bucket);
        let storeDetails = await StoreBucketTb.find({}, { projection: { "_id": 0, "store_name": 1, "store_code": 1, "amount": 1 } }).toArray();
        if (storeDetails.length > 0) {
            await jsonParser.DownloadCSV(storeDetails, res);
        } else {
            return res.json({
                status: false,
                message: "NO DATA FOUND"
            })
        }


    }
    catch (error) {

    }
}


module.exports = app