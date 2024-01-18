let express = require("express");
var qs = require("qs");
let mongo = require("../db.js");
let axios = require("axios");
const { ObjectId } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
let imeiStatus = require("../apxmodules/imeicurrentstatus.js");
let apxPrice = require("../apxmodules/apxapi.js");
let logsService = require("../logservice.js");
let notifications = require("../modules/pushnotification.js");
let app = express();

//#######################SAVE FCM TOKEN FOR EVERY EMPLOYEE DETAILS ######################
app.post("/saveFcmToken", saveFcmToken);
async function saveFcmToken(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_fcm_token_tb = await dataBase.collection(
      "stock_transfer_fcm_token"
    );
    let data = req.body;
    data.created_at = new Date();
    let fcmArray = [];
    let fcm_token_response = await sale_return_fcm_token_tb.findOne({
      store_code: req.body.store_code,
    });

    let fcm_token_array = fcm_token_response?.fcm_token;
    //###########FCM TOKEN IS SAVED FOR EMPLOYEEE IS THERE UPDATED ELSE INSERTED################
    if (fcm_token_response != null) {
      if (!fcm_token_array.includes(req.body.fcm_token)) {
        fcm_token_array.push(req.body.fcm_token);
      }
      fcmArray = fcm_token_array;
    } else {
      fcmArray.push(req.body.fcm_token);
    }
    let fcmObj = {
      store_code: req.body.store_code,
      store_id: req.body.store_id,
      store_name: req.body.store_name,
      created_at: new Date(),
      fcm_token: fcmArray,
    };

    await sale_return_fcm_token_tb.updateOne(
      { store_code: req.body.store_code },
      {
        $set: fcmObj,
      },
      { upsert: true }
    );
    return res.json({
      status: true,
      message: "FCM  TOKEN SAVED SUCCESSFULLY",
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

app.get("/getBrandList", getBrandList);
async function getBrandList(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_apx_products_tb = await dataBase.collection(
      "stock_transfer_apx_products"
    );
    let brandList = await sale_return_apx_products_tb.distinct("BRAND_NAME");
    return res.json({
      status: true,
      data: brandList,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//GET MODEL NAMES (ITEM NAMES AND ITEM CODE )
app.post("/getItemList", getItemList);
async function getItemList(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_apx_products_tb = await dataBase.collection(
      "stock_transfer_apx_products"
    );
    let get_item_names = await sale_return_apx_products_tb
      .find(
        { BRAND_NAME: req.body.brandName },
        { projection: { ITEM_NAME: 1, ITEM_CODE: 1 } }
      )
      .toArray();
    return res.json({
      status: true,
      data: get_item_names,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//#################GET STOCK BASED ON SINGLE BRAND AND SINGLE MODEL AND  SINGLE STORE##################
app.get("/getstock", getStockFromStore);
async function getStockFromStore(req, res) {
  try {
    let queryData = {
      CompanyCode: "HM",
      ItemCode: req.query.model,
      BranchCode: req.query.store,
      AsonDate: 0,
      Brand: req.query.brand,
      BranchCategory: 0,
      BranchPinCode: 0,
      ConsolidateStock: false,
      GroupBy: "NONE",
      Product: 0,
      ItemClassificationType: "NONE",
      ItemClassificationValue: 0,
    };
    var query = qs.stringify(queryData);
    let getStockconfig = {
      method: "get",
      maxBodyLength: Infinity,
      url: "http://183.82.44.213/api/apxapi/GetStockInfo?" + query,
      headers: {
        UserId: "WEBSITE",
        SecurityCode: "3489-7629-9163-3979",
      },
    };
    let get_stock_info = await axios(getStockconfig);
    let stock_response;
    if (req.query.store == 0) {
      stock_response = get_stock_info?.data?.Data.filter((item, index) => {
        return item.SALEABLE_STOCK != 0;
      });
    } else {
      stock_response = get_stock_info.data?.Data;
    }
    logsService.stock_transferlog(
      "debug",
      req,
      `GET STOCK FROM  SINGLE STORE`,
      queryData
    );
    return res.json({
      status: true,
      data: stock_response,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

//######################### GET ALL STORE LIST AND STOCK EXCEPT LOGIN STORE(NOT COMING DATA) ######################
app.get("/getStoreListStock", getStoreListStock);
async function getStoreListStock(req, res) {
  try {
    let queryData = {
      CompanyCode: "HM",
      ItemCode: req.query.model,
      BranchCode: req.query.store,
      AsonDate: 0,
      Brand: req.query.brand,
      BranchCategory: 0,
      BranchPinCode: 0,
      ConsolidateStock: false,
      GroupBy: "NONE",
      Product: 0,
      ItemClassificationType: "NONE",
      ItemClassificationValue: 0,
    };
    var query = qs.stringify(queryData);
    let getStockconfig = {
      method: "get",
      maxBodyLength: Infinity,
      url: "http://183.82.44.213/api/apxapi/GetStockInfo?" + query,
      headers: {
        UserId: "WEBSITE",
        SecurityCode: "3489-7629-9163-3979",
      },
    };
    let get_stock_info = await axios(getStockconfig);
    let stock_response;
    if (req.query.store == 0) {
      stock_response = get_stock_info?.data?.Data.filter((item, index) => {
        return (
          item.SALEABLE_STOCK != 0 && item.BRANCH_CODE != req.query.branch_code
        );
      });
    } else {
      stock_response = get_stock_info.data?.Data;
    }
    logsService.stock_transferlog(
      "debug",
      req,
      `GET ALL STORES STOCK`,
      queryData
    );
    return res.json({
      status: true,
      data: stock_response,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

//############### CREATE REQUESTED  STOCK  API##########################
app.post("/stockRaise", stockRaise);
async function stockRaise(req, res) {
  try {
    let data = req.body;
    let dataBase = await mongo.connect();
    let stock_request_tb = await dataBase.collection("stock_request");
    let users_tb = await dataBase.collection("users");
    let stores_tb = await dataBase.collection("stores");
    let fcm_token_tb = await dataBase.collection("stock_transfer_fcm_token");
    logsService.stock_transferlog("debug", req, `CREATE STOCK REQ`, data);
    let unique_to_store = await stores_tb.findOne({
      store_code: req.body.to_store,
    });
    let unique_from_store = await stores_tb.findOne({
      _id: new ObjectId(req.body.from_store),
    });
    if (unique_to_store == null) {
      return res.json({
        status: false,
        message: "To Store name is not there",
      });
    }
    if (unique_from_store == null) {
      return res.json({
        status: false,
        message: "From Store name is not there",
      });
    }
    data.from_store_code = unique_from_store?.store_code;
    data.from_store_name = unique_from_store?.store_name;
    data.to_store = unique_to_store?._id.toString();
    data.to_store_code = unique_to_store?.store_code;
    data.to_store_name = unique_to_store?.store_name;
    let to_employee_details = await users_tb.findOne(
      {
        store_id: new Object(unique_to_store?._id),
      },
      { projection: { phone: 1, emp_id: 1, name: 1, email: 1, user_type: 1 } }
    );
    let from_employee_details = await users_tb.findOne(
      {
        store_id: new Object(unique_from_store?._id),
      },
      { projection: { phone: 1, emp_id: 1, name: 1, email: 1, user_type: 1 } }
    );
    data.to_employee_details = to_employee_details;
    data.from_employee_details = from_employee_details;
    data.received_by = to_employee_details?._id.toString();
    data.id = uuidv4();
    data.created_at = new Date();
    await stock_request_tb.insertOne(data);
    logsService.stock_transferlog(
      "debug",
      req,
      `CREATE STOCK AFTER INSERT`,
      data
    );
    //### NEED TO TRIGGER PUSH NOTIFICATIONS FOR TO STORE PERSON(STORE-2)#########
    let token = await fcm_token_tb.findOne({
      store_id: unique_to_store?._id.toString(),
    });
    // logsService.stock_transferlog(
    //   "debug",
    //   req,
    //   `NOTIFICATION TOKEN`,
    //   token?.fcm_token
    // );
    // if (token != null) {
    //   let notification_body = {
    //     title: "New Stock Request",
    //     message: `You Have Received A New Stock Request From ${data.from_store_name}`,
    //     type: "Raised",
    //   };
    //   logsService.stock_transferlog(
    //     "debug",
    //     req,
    //     `NOTIFICATION BODY`,
    //     notification_body
    //   );
    //   await notifications.sendNotification(notification_body, token?.fcm_token);
    // }
    return res.json({
      status: true,
      message: "Success",
      data: data,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//##################### GETTING REQUESTED STOCK AND REAISED STOCK #####################//

async function stock_request_aggregateQuery(query) {
  try {
    let dataBase = await mongo.connect();
    let stock_request_tb = await dataBase.collection("stock_request");
    let stock_aggregate_response = await stock_request_tb
      .aggregate([
        {
          $addFields: {
            tostoreObjectId: { $toObjectId: "$to_store" },
            fromstoreObjectId: { $toObjectId: "$from_store" },
          },
        },
        { $match: query },
        {
          $lookup: {
            from: "stores",
            localField: "tostoreObjectId",
            foreignField: "_id",
            as: "toStoreData",
          },
        },
        {
          $lookup: {
            from: "stores",
            localField: "fromstoreObjectId",
            foreignField: "_id",
            as: "fromStoreData",
          },
        },
        {
          $project: {
            brand: 1,
            model: 1,
            quantity: 1,
            status: 1,
            toStoreData: 1,
            fromStoreData: 1,
            internal_status: 1,
            id: 1,
            reasons: 1,
            created_at: 1,
          },
        },
      ])
      .sort({ created_at: -1 })
      .toArray();
    return stock_aggregate_response;
  } catch (error) {
    console.log("error", error);
    return "ERROR";
  }
}
//################### REQUESTED STOCK DETAILS #############################
app.get("/getRequestedStock", getRequestedStock);
async function getRequestedStock(req, res) {
  try {
    logsService.stock_transferlog("debug", req, `REQUESTED STOCK`, req.query);
    let requested_response;
    if (req.query.status == "all") {
      let query = {
        from_store: req.query.store_id,
        $or: [
          { status: { $in: ["raised", "in-transit", "received", "rejected"] } },
          {
            internal_status: {
              $in: [
                "admin-approved",
                "in-transit",
                "received",
                "reject-store-2",
                "admin-reject",
                "approved-store-2",
              ],
            },
          },
        ],
      };
      requested_response = await stock_request_aggregateQuery(query);
    } else {
      let query = {};
      query.from_store = req.query.store_id;
      query.status = req.query.status;
      requested_response = await stock_request_aggregateQuery(query);
    }
    return res.json({
      status: true,
      data: requested_response,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//######################### RECEIVED STOCK DETAILS ##########################
//["forward-store-2", "in-transist", "reject-store-2"]
app.get("/getReceivedStock", getReceivedStock);
async function getReceivedStock(req, res) {
  try {
    logsService.stock_transferlog("debug", req, `RECEIVED STOCK`, req.query);
    let received_response;
    if (req.query.status == "all") {
      let query = {
        to_store: req.query.store_id,
        $or: [
          { status: { $in: ["raised", "received", "rejected"] } },
          {
            internal_status: {
              $in: [
                "forward-store-2",
                "in-transit",
                "reject-store-2",
                "received",
                "rejected",
                "approved-store-2",
                "admin-approved",
                "admin-reject",
              ],
            },
          },
        ],
      };
      received_response = await stock_request_aggregateQuery(query);
    } else {
      let query = {};
      query.to_store = req.query.store_id;
      query.status = req.query.status;
      received_response = await stock_request_aggregateQuery(query);
    }
    return res.json({
      status: true,
      data: received_response,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//####################### ADMIN RAISED STOCK ##########################
app.get("/getAdminRaisedStock", getAdminRaisedStock);
async function getAdminRaisedStock(req, res) {
  try {
    logsService.stock_transferlog(
      "debug",
      req,
      `ADMIN RAISED TAB STOCK`,
      req.query
    );
    let query = {
      to_store: req.query.store_id,
      $or: [
        // { status: { $in: ["raised", "received", "rejected"] } },
        {
          internal_status: {
            $in: ["approved-store-2", "admin-approved", "admin-reject"],
          },
        },
      ],
    };
    // if (
    //   req.query.store != null ||
    //   req.query.store != undefined ||
    //   req.query.store != "" ||
    //   req.query.store != "null"
    // ) {
    //   query.from_store = req.query.from_store;
    // }
    // if (
    //   req.query.brand != null ||
    //   req.query.brand != undefined ||
    //   req.query.brand != "" ||
    //   req.query.brand != "null"
    // ) {
    //   query.brand = req.query.brand;
    // }
    let received_response = await stock_request_aggregateQuery(query);
    return res.json({
      status: true,
      data: received_response,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//##################### REJECTED  Stock ###########################
app.get("/rejectReasons", rejectReasons);
async function rejectReasons(req, res) {
  try {
    let dataBase = await mongo.connect();
    let stock_transfer_reject_reasons_tb = await dataBase.collection(
      "stock_transfer_reject_reasons"
    );
    let get_all_reasons = await stock_transfer_reject_reasons_tb
      .find({})
      .toArray();
    return res.json({
      status: true,
      message: "Reasons Displayed Successfully",
      data: get_all_reasons,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

//####################### REJECT STOCK FROM STORE 2 ######################################
app.put("/rejectStock", rejectStock);
async function rejectStock(req, res) {
  try {
    let dataBase = await mongo.connect();
    let stock_request_tb = await dataBase.collection("stock_request");
    await stock_request_tb.updateOne(
      { id: req.body.id },
      {
        $set: {
          status: "rejected",
          reasons: req.body.reasons,
          internal_status: "rejected",
        },
      }
    );
    return res.json({
      status: true,
      message: "Stock Rejected Successfully",
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//################################ APPROVED FROM STORE 2 ################
app.put("/approvedStock", approvedStock);
async function approvedStock(req, res) {
  try {
    let dataBase = await mongo.connect();
    let stock_request_tb = await dataBase.collection("stock_request");
    await stock_request_tb.updateOne(
      { id: req.body.id },
      {
        $set: {
          status: "raised",
          internal_status: "approved-store-2",
        },
      }
    );
    return res.json({
      status: true,
      message: "Approved successfully",
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//####################### ADMIN PANAL HEAD QUATERS ##########################//
//GET ALL STOCK DETAILS PPROVED FROM STORE -2
app.get("/stockTrasferToHeadQuaters", stockTrasferToHeadQuaters);
async function stockTrasferToHeadQuaters(req, res) {
  try {
    let dataBase = await mongo.connect();
    let stock_request_tb = await dataBase.collection("stock_request");
    let headquaters_stock_response = await stock_request_tb
      .aggregate([
        {
          $addFields: {
            toStoreObjectId: {
              $toObjectId: "$to_store",
            },
          },
        },
        {
          $match: {
            internal_status: "approved-store-2",
          },
        },
        {
          $addFields: {
            fromStoreObjectId: {
              $toObjectId: "$from_store",
            },
          },
        },

        {
          $lookup: {
            from: "stores",
            localField: "toStoreObjectId",
            foreignField: "_id",
            as: "toStoreData",
          },
        },
        {
          $lookup: {
            from: "stores",
            localField: "fromStoreObjectId",
            foreignField: "_id",
            as: "fromStoreData",
          },
        },
        {
          $project: {
            brand: 1,
            model: 1,
            quantity: 1,
            fromStoreData: 1,
            toStoreData: 1,
            id: 1,
            internal_status: 1,
            status: 1,
          },
        },
      ])
      .toArray();
    return res.json({
      status: true,
      data: headquaters_stock_response,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//######################SCAN IMEI NUMBERS ##########################//
app.post("/scanIMEINumbers", scanIMEINumbers);
async function scanIMEINumbers(req, res) {
  try {
    logsService.stock_transferlog(
      "debug",
      req,
      `SCAN IMEI NUMBER REQUEST`,
      req.body
    );
    let imei_details = await imeiStatus.IMEICurrentStatus(req.body);
    if (imei_details?.length == 0) {
      return res.json({
        status: false,
        message: "Invalid IMEI Number",
      });
    }
    let imeiObj = {
      item_code: imei_details[0]?.ITEM_CODE,
      item_name: imei_details[0]?.ITEM_NAME,
      brand: imei_details[0]?.BRAND,
      imei_no: imei_details[0]?.SERIAL_NO,
      branch_code: imei_details[0]?.BRANCH_CODE,
      branch_name: imei_details[0]?.AVAILABLE_BRANCH,
    };
    let apx_price = await apxPrice.getPriceFromPriceTemplate(
      imei_details[0]?.ITEM_CODE
    );
    imeiObj.price = apx_price[0]?.ITEM_PRICE;
    logsService.stock_transferlog("debug", req, `SCAN IMEI OBJECT`, imeiObj);
    return res.json({
      status: true,
      data: imeiObj,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//once Add Delivary details to need to trigger Apx API
app.post("/addDelivaryDetails", addDelivaryDetails);
async function addDelivaryDetails(req, res) {
  try {
    let dataBase = await mongo.connect();
    let stock_request_tb = await dataBase.collection("stock_request");
    logsService.stock_transferlog(
      "debug",
      req,
      `ADD DELIVARY DETAILS`,
      req.body
    );
    let stock_transfer_details = await stock_request_tb.findOne({
      id: req.body.id,
    });
    let hasDuplicateImei = req.body.imei_data.some(
      (item, index) =>
        req.body.imei_data.findIndex((i) => i.imei_no === item.imei_no) !==
        index
    );
    let hasBranchCode = req.body.imei_data.every(
      (item) => item.branch_code === req.body.branch_code
    );
    if (!hasBranchCode) {
      return res.json({
        status: false,
        message: "Branch Codes mis match",
      });
    }
    if (hasDuplicateImei) {
      return res.json({
        status: false,
        message: "DUPLICATE IMEI Numbers",
      });
    }
    if (req.body.imei_data?.length == stock_transfer_details?.quantity) {
      const hascheckItemCode = req.body.imei_data?.every(
        (item) => item.item_code === stock_transfer_details?.item_code
      );
      if (hascheckItemCode) {
        await stock_request_tb.updateOne(
          {
            id: req.body.id,
          },
          {
            $set: {
              status: "in-transit",
              imei_date: req.body.imei_data,
              mode_of_delivary: req.body.mode_of_delivary,
              description: req.body.description,
              attachment: req.body.attachment,
              amount: req.body.amount,
              internal_status: "in-transit",
              product_attachments: req.body.product_attachments,
              imei_data: req.body.imei_data,
            },
          }
        );
        return res.json({
          status: true,
          message: "STOCK SUCCESSFULLY TRANSFER TO RAISED STORE",
        });
      } else {
        return res.json({
          status: false,
          message: "ITEM CODE MISMATCH",
        });
      }
    } else {
      return res.json({
        status: false,
        message: "QUANTITY AND PRODUCTS ARE MIS MATCH",
      });
    }
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//WHEN DELIVAR DETAILS RECEIVED FROM STORE 2  Status Has been updated

app.post("/updateReceivedStock", updateReceivedStock);
async function updateReceivedStock(req, res) {
  try {
    let dataBase = await mongo.connect();
    let stock_request_tb = await dataBase.collection("stock_request");
    await stock_request_tb.updateOne(
      { id: req.body.id },
      {
        $set: {
          status: "received",
          internal_status: "received",
          product_received_attachments: req.body.product_received_attachments,
        },
      }
    );
    //need to trigger APX API
    return res.json({
      status: true,
      message: "STOCK RECEIVED SUCCESSFULLY",
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//############## GET LIST OF MODE OF DELIVARY DROP DOWNS################
app.get("/getModeOfDelivaryNames", getModeOfDelivaryNames);
async function getModeOfDelivaryNames(req, res) {
  try {
    let dataBase = await mongo.connect();
    let stock_request_modeof_delivarytb = await dataBase.collection(
      "stock_request_modeof_delivary"
    );
    let get_delivary_modes = await stock_request_modeof_delivarytb
      .find({})
      .toArray();
    return res.json({
      status: true,
      data: get_delivary_modes,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERRRO",
    });
  }
}

//get delivary details by unique id
app.get("/getIntransistDelivaryDetails", getIntransistDelivaryDetails);
async function getIntransistDelivaryDetails(req, res) {
  try {
    let id = req.query.id;
    let dataBase = await mongo.connect();
    let stock_request_tb = await dataBase.collection("stock_request");
    let get_single_stock_request = await stock_request_tb
      .find({ id: id })
      .toArray();
    return res.json({
      status: true,
      data: get_single_stock_request,
    });
  } catch (error) {
    logsService.stock_transferlog("error", req, error + "");
    return res.json({
      status: true,
      message: "ERROR",
    });
  }
}

// db.collectionName.find({
//   "imei_date": {
//     $elemMatch: {
//       "imei_no": "35277562097351209099989"
//     }
//   }
// })

//################## ADMIN APPROVED  NEED TO CHECK IMEI NUMBER if count is one no need to send any notification
//################## if count is one to send notification to ASM for both FROM STORE AND TO STORE ################
app.post("/adminStockApproved", adminStockApproved);
async function adminStockApproved(req, res) {
  try {
    let dataBase = await mongo.connect();
    let stock_request_tb = await dataBase.collection("stock_request");
    if (req.body.status == "rejected") {
      await stock_request_tb.updateOne(
        { id: req.body.id },
        {
          $set: {
            status: "raised",
            internal_status: "admin-reject",
            admin_details: {
              emp_id: req.body.emp_id,
              name: req.body.name,
              mobile: req.body.mobile,
            },
          },
        }
      );
      return res.json({
        status: true,
        message: "Admin rejected Successfully",
      });
    } else {
      let imei_array = req.body.imei_date.map((item, index) => {
        return item.imei_no;
      });
      let hasImeiCheck = await stock_request_tb
        .aggregate([
          {
            $unwind: "$imei_date",
          },
          {
            $match: {
              "imei_date.imei_no": {
                $in: imei_array,
              },
              status: "admin-approved",
            },
          },
          {
            $group: {
              _id: "$_id",
              imei_date: { $push: "$imei_date" },
            },
          },
        ])
        .toArray();
      if (hasImeiCheck?.length == 1) {
        await stock_request_tb.updateOne(
          { id: req.body.id },
          {
            $set: {
              status: "raised",
              internal_status: "admin-approved",
              admin_details: {
                emp_id: req.body.emp_id,
                name: req.body.name,
                mobile: req.body.mobile,
              },
            },
          }
        );
        //need to update status and internal status
        return res.json({
          status: true,
          message: "Stock Approved Successfully",
          count: hasImeiCheck?.length,
        });
      } else if (hasImeiCheck?.length == 2) {
        //need to update status and internal status
        return res.json({
          status: true,
          message: "Send Push Notification To Asm",
          count: hasImeiCheck?.length,
        });
        //send PUSH Notifications TO ASM
      } else if (hasImeiCheck?.length >= 3) {
        //need to update status and internal status
        //SEND PUSH NOTIIFCATIONS TO HIGHER AUTHORIITES
        return res.json({
          status: true,
          message: "Send Push Notification To Asm And Higher Authorities",
          count: hasImeiCheck?.length,
        });
      }
    }
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

module.exports = app;
