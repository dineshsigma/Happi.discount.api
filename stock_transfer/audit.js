let express = require("express");
let mongo = require("../db.js");
const { ObjectId } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
let stock = require("../apxmodules/checkstock.js");
let logsService = require("../logservice.js");
let axios = require("axios");
let app = express();

//save Audit Transctions
app.post("/createAudit", createAudit);
async function createAudit(req, res) {
  try {
    logsService.stock_transferlog(
      "debug",
      req,
      `CREATE AUDIT REQUEST`,
      req.body
    );
    let dataBase = await mongo.connect();
    let stock_transfer_audit_tb = await dataBase.collection(
      "stock_transfer_audit_report"
    );
    let users = await dataBase.collection("users");
    let users_phone_numbers = [];
    let users_email = [];
    for (let i = 0; i < req.body.success_stock?.length; i++) {
      let users_data = await users.findOne({
        store_id: new ObjectId(req.body.success_stock[i].store_id),
      });
      let audit_obj = {
        audit_name: req.body.audit_name,
        store_name: req.body.success_stock[i].store_name,
        store_code: req.body.success_stock[i].store_code,
        store_id: req.body.success_stock[i].store_id,
        brand: req.body.brand,
        model: req.body.success_stock[i].model,
        item_code: req.body.item_code,
        phone: users_data?.phone,
        email: users_data?.email,
        emp_id: users_data?.emp_id,
        created_at: new Date(),
        id: uuidv4(),
        audit_admin_details: {
          emp_id: req.body.emp_id,
          name: req.body.name,
          mobile: req.body.mobile,
        },
      };
      users_phone_numbers.push(users_data?.phone);
      users_email.push(users_data?.email);
      await stock_transfer_audit_tb.insertOne(audit_obj);
    }
    //trigger call notifications and email notifications
    return res.json({
      status: true,
      message: "AUDIT TRANSCTION SUCCESSFULLY COMPLETDD",
      users_phone_numbers: users_phone_numbers,
      users_email: users_email,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//check avaliability stock
app.post("/getstocklist", getstocklist);
async function getstocklist(req, res) {
  try {
    let dataBase = await mongo.connect();
    let storecoll = await dataBase.collection("stores");
    let success_stock = [];
    let zero_stock = [];
    logsService.stock_transferlog(
      "debug",
      req,
      `AUDIT- STOCK LIST REQUEST`,
      req.body
    );
    for (let i = 0; i < req.body.store.length; i++) {
      let storedata = await storecoll.findOne({
        _id: new ObjectId(req.body.store[i]),
      });
      let stockObj = {
        store: storedata?.store_code,
        brand: req.body.brand,
        item_code: req.body.item_code,
      };
      let availability_stock = await stock.checkStock(stockObj);
      if (availability_stock[0]?.SALEABLE_STOCK == 0) {
        zero_stock.push({
          store_code: storedata?.store_code,
          stock: availability_stock[0]?.SALEABLE_STOCK,
          store_name: storedata?.store_name,
          store_id: storedata?._id.toString(),
          model: availability_stock[0]?.ITEM_NAME,
        });
      } else {
        success_stock.push({
          store_code: storedata?.store_code,
          stock: availability_stock[0]?.SALEABLE_STOCK,
          store_name: storedata?.store_name,
          store_id: storedata?._id.toString(),
          model: availability_stock[0]?.ITEM_NAME,
        });
      }
    }
    logsService.stock_transferlog(
      "debug",
      req,
      `AUDIT SUCCESS AND ZERO STOCKS LOGS`,
      {
        success_stock: success_stock,
        zero_stock: zero_stock,
      }
    );
    return res.json({
      status: true,
      success_stock: success_stock,
      zero_stock: zero_stock,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

app.post("/auditScan", auditScan);
async function auditScan(req, res) {
  try {
    let data = req.body;
    let dataBase = await mongo.connect();
    let auditScan = await dataBase.collection("stock_transfer_audit_scan");
    for (let i = 0; i < data.imeidata?.length; i++) {
      console.log("ii", i);
      let auditscanconfig = {
        method: "get",
        maxBodyLength: Infinity,
        url: `http://183.82.44.213/api/apxapi/GetImeiSerialNoCurrentStatus?CompanyCode=HM&ImeiSerialNo=${data.imeidata[i]}`,
        headers: {
          UserId: "WEBSITE",
          SecurityCode: "3489-7629-9163-3979",
        },
      };
      let auditScanResponse = await axios(auditscanconfig);
      let auditObj = {
        store_code: req.body.store_code,
        store_name: req.body.store_name,
        store_id: req.body.store_id,
        imei_no: data.imeidata[i],
        imei_response: auditScanResponse.data.Data[0],
        created_date: new Date(),
      };
      await auditScan.insertOne(auditObj);
    }
    return res.json({
      status: true,
      message: "Audit Imei scaned Successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

module.exports = app;
