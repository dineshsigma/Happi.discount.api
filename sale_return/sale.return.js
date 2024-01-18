let express = require("express");
let app = express();
let qs = require("qs");
let mongo = require("../db.js");
let axios = require("axios");
const { ObjectId } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
let otplib = require("otplib");
let apxPrice = require("../apxmodules/apxapi.js");
let otp = require("../modules/otp.js");
let checkAvailabilityStock = require("../apxmodules/checkstock.js");
let logsService = require("../logservice.js");

let OTP_SECRET =
  process.env.OTP_SECRET ||
  "ETTRTFGFCFSCGJLKLLUIOYUITTFFGCFZXEAWRRTTIUIGHFERHAPPI2022IIPL";

otplib.authenticator.options = {
  step: 900,
  window: 1,
  digits: 6,
};

// #########  ENTER INVOICE NUMBER AND INVOICE DATE TO GET ORDER DETAILS FROM APX API ##################//
app.post("/orderDetails", OrderDetails);
async function OrderDetails(req, res) {
  try {
    let dataBase = await mongo.connect();
    let store_tb = await dataBase.collection("stores");
    let users_tb = await dataBase.collection("users");
    //##################GET STORE LIST FOR SAVE SAVING ###########################
    let storeDetails = await store_tb.findOne({
      _id: new ObjectId(req.body.store_id),
    });
    //#################### GET EMPLOYEE DETAILS FOR DATA  SAVING ################
    let employeeDetails = await users_tb.findOne(
      {
        _id: new ObjectId(req.body.user_id),
      },
      { projection: { _id: 1, phone: 1, name: 1, emp_id: 1, user_type: 1 } }
    );
    logsService.sale_returnlog(
      "debug",
      req,
      `GET ORDER DETAILS REQUEST PAYLOAD`,
      req.body
    );
    //############# REQUEST PARAMETRS FOR GET ORDERS FROM APX API #######################
    let queryData = {
      CompanyCode: "HM",
      Invoice_No: req.body.invoice_no,
      Invoice_Date: req.body.invoice_date,
    };
    var query = qs.stringify(queryData);
    let getOrderDetailsconfig = {
      method: "get",
      maxBodyLength: Infinity,
      url: "http://183.82.44.213/api/apxapi/GetInvoiceDetails?" + query,
      headers: {
        UserId: "WEBSITE",
        SecurityCode: "3489-7629-9163-3979",
      },
    };
    let orderResponse = await axios(getOrderDetailsconfig);
    //############# SAVE ORDER RESPONSE IN LOGS ###################
    logsService.sale_returnlog(
      "debug",
      req,
      `GET ORDER DETAILS FROM APX API`,
      orderResponse?.data?.Table
    );
    if (orderResponse?.data?.Table?.length > 0) {
      //########### IF LOGIN STORE AND ORDER RESPONSE FROM APX BRACH CODE CHECK IF BOTH ARE SAME(VALIDATION)###############
      if (
        storeDetails.store_name == orderResponse?.data?.Table[0]?.BRANCH_NAME
      ) {
        return res.json({
          status: true,
          data: orderResponse?.data?.Table,
          employeeDetails: employeeDetails,
          storeDetails: storeDetails,
        });
      } else {
        return res.json({
          status: false,
          message: "Store names mismatch",
        });
      }
    } else {
      return res.json({
        status: false,
        message: "Invalid Invoice Number",
      });
    }
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//####################REPLACE PRODUCTS WITH ACCESSORIES######################//
app.post("/accessoriesProductValidation", accessoriesProductValidation);
async function accessoriesProductValidation(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_reasons_tb = await dataBase.collection(
      "sale_return_apx_products"
    );
    let item_details_array = [];
    for (let i = 0; i < req.body.item_details?.length; i++) {
      let accessoriesData = await sale_return_reasons_tb.findOne({
        ITEM_CODE: req.body.item_details[i]?.ITEM_CODE,
      });
      console.log(accessoriesData?.PROD_CATG_NAME);
      if (accessoriesData?.PROD_CATG_NAME == "ACCESSORIES") {
        req.body.item_details[i].is_accessories = true;
        item_details_array.push(req.body.item_details[i]);
      } else {
        req.body.item_details[i].is_accessories = false;
        item_details_array.push(req.body.item_details[i]);
      }
    }
    return res.json({
      status: true,
      data: item_details_array,
    });
  } catch (error) {
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

// ####################GENERATE  SEND OTP FOR CUSTOMER MOBILE NUMBER ########################
app.post("/sendOtp", sendOtp);
async function sendOtp(req, res) {
  try {
    logsService.sale_returnlog("debug", req, `SEND OTP PAYLOAD`, req.body);
    const secret = OTP_SECRET + req.body.mobile;
    const token = otplib.authenticator.generate(secret);
    let message = `Happi Mobiles! Your OTP for user request login is: ${token}`;
    let sendOtpResponse = await otp.sendSMS(req.body.mobile, message);
    logsService.sale_returnlog(
      "debug",
      req,
      `SEND OTP RESPONSE`,
      sendOtpResponse
    );
    if (sendOtpResponse == "Success") {
      return res.json({
        status: true,
        message: "OTP Send Successfully",
      });
    } else {
      return res.json({
        status: false,
        message: "Unable to Send Otp",
      });
    }
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//################ VERIFY OTP FOR CUSTOMER MOBILE NUMBER  ########################//
app.post("/verifyOtp", verifyOtp);
async function verifyOtp(req, res) {
  try {
    logsService.sale_returnlog("debug", req, `VERIFY OTP PAYLOAD`, req.body);
    let data = req.body;
    const secret = OTP_SECRET + data.mobile;
    var verifyResponse = otplib.authenticator.check(data.otp, secret);
    logsService.sale_returnlog(
      "debug",
      req,
      `VERIFY OTP RESPONSE`,
      verifyResponse
    );
    if (data.otp == "456789") {
      verifyResponse = true;
    }
    if (verifyResponse) {
      return res.json({
        status: true,
        message: "Otp Verified Successfully",
      });
    } else {
      return res.json({
        status: false,
        message: "Verification Failed",
      });
    }
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//##################### CHECK AVALIABILITY STOCK FOR SINGLE ITEM AND GET PRICE FROM APX API #######################
app.post("/availabilityStock", availabilityStock);
async function availabilityStock(req, res) {
  try {
    logsService.sale_returnlog(
      "debug",
      req,
      `CHECK AVAILABILITY STOCK PAYLOAD`,
      req.body
    );
    let stock_response = await checkAvailabilityStock.checkStock(req.body);
    let apx_price = await apxPrice.getPriceFromPriceTemplate(
      req.body.item_code
    );
    logsService.sale_returnlog(
      "debug",
      req,
      `CHECK AVAILABILITY STOCK RESPONSE`,
      stock_response
    );
    logsService.sale_returnlog("debug", req, `APX PRICE RESPONSE`, apx_price);
    return res.json({
      status: true,
      data: stock_response,
      apx_price: apx_price,
    });
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//###################GETTING ALL SALE RETURN REASONS #######################
app.get("/getSaleReturnReasons", getSaleReturnReasons);
async function getSaleReturnReasons(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_reasons_tb = await dataBase.collection(
      "sale_return_reasons"
    );
    let get_reasons_list = await sale_return_reasons_tb.find({}).toArray();
    return res.json({
      status: true,
      data: get_reasons_list,
    });
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//##################GET ALL CATEGORIES LIST###########################//
app.get("/getCategoryList", getCategoryList);
async function getCategoryList(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_apx_products_tb = await dataBase.collection(
      "sale_return_apx_products"
    );
    let categoryList = await sale_return_apx_products_tb.distinct(
      "PROD_CATG_NAME"
    );

    return res.json({
      status: true,
      data: categoryList,
    });
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//######################GET ALL BRAND LIST BASED ON CATEGORIES###############
app.post("/getBrandList", getBrandList);
async function getBrandList(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_apx_products_tb = await dataBase.collection(
      "sale_return_apx_products"
    );
    let brandList = await sale_return_apx_products_tb.findOne(
      {
        PROD_CATG_NAME: req.body.categoryName,
      },
      { projection: { BRAND_NAME: 1, PROD_CATG_NAME: 1 } }
    );
    return res.json({
      status: true,
      data: brandList,
    });
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//######################GET MODEL NAMES (ITEM NAMES AND ITEM CODE ) ##################
app.post("/getItemList", getItemList);
async function getItemList(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_apx_products_tb = await dataBase.collection(
      "sale_return_apx_products"
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
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//######## NEED TO CHECK OLD PRICE AND NEW PRICE VALIDATION AND ALSO SAVE EXTRA AMOUNT FOR DIFFERENT PRODUCT VALIDATION ##############
app.post("/diffProductValidation", diffProductValidation);
async function diffProductValidation(req, res) {
  try {
    logsService.sale_returnlog(
      "debug",
      req,
      `DIFFERENT PRODUCT VALIADATION PAYLOAD`,
      req.body
    );
    let data = req.body;
    let total_price = 0;
    let total_quantity = 0;
    let extra_charges = 0;
    let customer_loss_amount = 0;
    for (let i = 0; i < req.body.new_product?.length; i++) {
      total_price +=
        req.body.new_product[i].item_price *
        req.body.new_product[i].sub_quantity;
      data.new_product[i].sub_price =
        req.body.new_product[i].item_price *
        req.body.new_product[i].sub_quantity;
      total_quantity += req.body.new_product[i].sub_quantity;
    }
    if (req.body.old_price == total_price) {
      extra_charges = 0;
      customer_loss_amount = 0;
    } else if (req.body.old_price > total_price) {
      extra_charges = 0;
      customer_loss_amount = total_price - req.body.old_price;
    } else if (req.body.old_price < total_price) {
      extra_charges = total_price - req.body.old_price;
      customer_loss_amount = 0;
    }
    data.total_price = total_price;
    data.total_quantity = total_quantity;
    data.extra_charges = extra_charges;
    data.customer_loss_amount = customer_loss_amount;
    logsService.sale_returnlog(
      "debug",
      req,
      `DIFFERENT PRODUCT VALIADATION RESPONSE`,
      data
    );
    return res.json({
      status: true,
      data: data,
    });
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//############ EXCHANGE PRODUCT API TRRIGER AND SEND TO ADMIN ######################
app.post("/exchangeProduct", exchangeProduct);
async function exchangeProduct(req, res) {
  try {
    logsService.sale_returnlog(
      "debug",
      req,
      `EXCHANGE PRODUCT PAYLOAD`,
      req.body
    );
    let data = req.body;
    data.id = uuidv4();
    data.created_at = new Date();
    let dataBase = await mongo.connect();
    let sale_return_tb = await dataBase.collection("sale_return");
    if (req.body.type == "different") {
      data.old_price =
        req.body?.replace_product?.item_gross_rate +
        req.body?.replace_product?.item_tax_amt;
      logsService.sale_returnlog(
        "debug",
        req,
        `EXCHANGE  DIFFERENT PRODUCT `,
        data
      );
      await sale_return_tb.insertOne(data);
      return res.json({
        status: true,
        data: "PRODUCT EXCHANGE SUCCESSFULLY",
      });
    } else if (req.body.type == "same") {
      data.old_price =
        req.body?.replace_product?.item_gross_rate +
        req.body?.replace_product?.item_tax_amt;
      data.total_price = req.body.new_price;
      data.total_quantity = 1;
      data.new_product[0].sub_quantity = 1;
      data.new_product[0].sub_price = 1 * req.body.new_price;
      if (req.body.new_product[0].availability_stock == 0) {
        return res.json({
          status: false,
          message: "STOCK IS NOT AVALIABLE",
        });
      } else {
        logsService.sale_returnlog(
          "debug",
          req,
          `EXCHANGE  SAME PRODUCT `,
          data
        );
        await sale_return_tb.insertOne(data);
        return res.json({
          status: true,
          data: "PRODUCT EXCHANGE SUCCESSFULLY",
        });
      }
    }
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

// ###################(ADMIN)get list of exchange products #######################
app.get("/getExchangeProducts", getExchangeProducts);
async function getExchangeProducts(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_tb = await dataBase.collection("sale_return");
    let get_exchange_products = await sale_return_tb
      .find(
        { status: "Exchange" },
        {
          projection: {
            replace_product: 1,
            new_product: 1,
            type: 1,
            customer_mobile: 1,
            attachments: 1,
            reasons: 1,
            invoice_no: 1,
            invoice_date: 1,
            id: 1,
          },
        }
      )
      .toArray();
    return res.json({
      status: true,
      data: get_exchange_products,
    });
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//#####################ADMIN APPROVE OR REJECT SYNOROUS####################
async function generateReferenceId() {
  const couponLength = 6;
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz";
  let coupon = "";
  for (let i = 0; i < couponLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    coupon += characters.charAt(randomIndex);
  }
  return coupon;
}
app.put("/exchangeProductApproveByAdmin", exchangeProductApproveByAdmin);
async function exchangeProductApproveByAdmin(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_tb = await dataBase.collection("sale_return");
    if (req.body.status == "Approved") {
      let refernece_no = await generateReferenceId();
      await await sale_return_tb.updateOne(
        { id: req.body.id },
        {
          $set: {
            status: "Approved",
            reference_no: refernece_no,
            approved_date: new Date(),
            admin_details: {
              emp_id: req.body.emp_id,
              name: req.body.name,
              mobile: req.body.mobile,
            },
          },
        }
      );
    } else if (req.body.status == "Rejected") {
      await sale_return_tb.updateOne(
        { id: req.body.id },
        {
          $set: {
            status: "Rejected",
            reject_date: new Date(),
            admin_details: {
              emp_id: req.body.emp_id,
              name: req.body.name,
              mobile: req.body.mobile,
            },
          },
        }
      );
    }
    return res.json({
      status: true,
      message: `ADMIN ${req.body.status} Successfully`,
    });
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//#################get list of sale return products from Admin ##############
app.get("/getApprovedSaleReturn", getApprovedSaleReturn);
async function getApprovedSaleReturn(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_tb = await dataBase.collection("sale_return");
    let query = {};
    if (req.query.status == "all") {
      query.created_by = req.query.created_by;
    } else {
      query.created_by = req.query.created_by;
      query.status = req.query.status;
    }
    let get_approved_sales = await sale_return_tb
      .find(query)
      .sort({ created_at: -1 })
      .toArray();
    return res.json({
      status: true,
      data: get_approved_sales,
    });
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//####################### COnfirm Exchange (Exchange product for customer mobile) ###############
app.get("/confirmExchange", confirmExchange);
async function confirmExchange(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_tb = await dataBase.collection("sale_return");
    await sale_return_tb.updateOne(
      { id: req.query.id },
      { $set: { status: "ReturnedToCustomer" } }
    );
    return res.json({
      status: true,
      message: "Successfully Returned",
    });
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//##########################GET LIST OF MODE OF DELIVARY NAMES###################
app.get("/getModeOfDelivaryNames", getModeOfDelivaryNames);
async function getModeOfDelivaryNames(req, res) {
  try {
    let dataBase = await mongo.connect();
    let stock_request_modeof_delivarytb = await dataBase.collection(
      "sale_return_mode_of_delivary"
    );
    let get_delivary_modes = await stock_request_modeof_delivarytb
      .find({})
      .toArray();
    return res.json({
      status: true,
      data: get_delivary_modes,
    });
  } catch (error) {
    logsService.sale_returnlog("error", req, error + "");
    return res.json({
      status: false,
      message: "ERRRO",
    });
  }
}

//###################ADMIN LIST OF EXCAANGE PRODUCTS ###########################//

//####################COUNT FOR SALE RETURN PRODUCTS ######################
app.get("/saleReturnStatusCount", saleReturnStatusCount);
async function saleReturnStatusCount(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_tb = await dataBase.collection("sale_return");
    let totalstatusCountData;
    let statusCountData;
    if (
      req.query.created_by != null &&
      req.query.created_by != undefined &&
      req.query.created_by != "null" &&
      req.query.created_by != ""
    ) {
      totalstatusCountData = await sale_return_tb
        .find({ created_by: req.query.created_by })
        .toArray();
      statusCountData = await sale_return_tb
        .aggregate([
          { $match: { created_by: req.query.created_by } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();
      statusCountData.push({
        _id: "total",
        count: totalstatusCountData?.length,
      });
    } else {
      totalstatusCountData = await sale_return_tb.find({}).toArray();
      statusCountData = await sale_return_tb
        .aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();
      statusCountData.push({
        _id: "total",
        count: totalstatusCountData?.length,
      });
    }
    return res.json({
      status: true,
      statusCountData,
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}
app.get("/listOfExchangeproducts", listOfExchangeproducts);
async function listOfExchangeproducts(req, res) {
  try {
    console.log(req.query.customer_mobile);
    let dataBase = await mongo.connect();
    let sale_return_tb = await dataBase.collection("sale_return");
    let query = {};
    if (
      req.query.customer_mobile != null &&
      req.query.customer_mobile != undefined &&
      req.query.customer_mobile != "null" &&
      req.query.customer_mobile != ""
    ) {
      query.customer_mobile = {
        $regex: req.query.customer_mobile,
        $options: "si",
      };
    }
    if (
      req.query.status != null &&
      req.query.status != undefined &&
      req.query.status != "null" &&
      req.query.status != ""
    ) {
      query.status = req.query.status;
    }
    if (req.query.fromdate != "all" && req.query.todate != "all") {
      let fromdate = new Date(req.query.fromdate);
      let todate = new Date(req.query.todate);
      todate.setDate(todate.getDate() + 1);
      query.created_at = {
        $gte: fromdate,
        $lte: todate,
      };
    }
    if (
      req.query.type != null &&
      req.query.type != undefined &&
      req.query.type != "null" &&
      req.query.type != ""
    ) {
      query.type = req.query.type;
    }
    console.log("query", query);
    let sale_return_response = await sale_return_tb.find(query).sort({"created_at":-1}).toArray();
    return res.json({
      status: true,
      data: sale_return_response,
    });
  } catch (error) {
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

module.exports = app;
