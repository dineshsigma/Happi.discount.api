let express = require("express");
const mongo = require("../../db.js");
const { ObjectId } = require("mongodb");
let axios = require("axios");
let getPriceFromPriceTemplate = require("../../apxmodules/apxapi");
let logsService = require("../../logservice.js");
let otplib = require("otplib");
let otp = require("../../modules/otp");
let app = express();
const TBL_Manager_Discount_Rules = "discount_manager_rules";
const TBL_Employee_Management = "discount_employee_management";
const TBL_APX_Products = "apx_product";
const TBL_Save_Discount = "save_discount";
const TBL_Store_Bucket = "discount_bucket";
const TBL_Discount_Settings = "discount_setting";
const TBL_RedeemableVoucher = "discount_redeemable_voucher";

let ManagerDiscountTb = null;
let ApxProductsTb = null;
const TBL_APX_PRODUCTS = "apx_product";
const TBL_Store_management = "discount_store_management";
let ApxProductTb = null;
let Store_managemntTb = null;
let Employee_managemntTb = null;
let SaveDiscountTb = null;
let StoreBucketTb = null;
let DiscountSettingsTb = null;
let RedeemableVoucherTb = null;
let from = new Date();
from.setHours(0, 0, 0, 0);
let to = new Date();
to.setHours(23, 59, 59, 999);
var OTP_SECRET =
  process.env.OTP_SECRET ||
  "ETTRTFGFCFSCGJLKLLUIOYUITTFFGCFZXEAWRRTTIUIGHFERHAPPI2022IIPL";

otplib.authenticator.options = {
  step: 900,
  window: 1,
  digits: 6,
};
//---------------------------------get StoreList for particular Employeee----------------------------//
//-------------------get stores drop down for Employee Store Head------------------------//
app.get("/getEmployeeStoreHeadList", getEmployeeStoreHeadList);
async function getEmployeeStoreHeadList(req, res) {
  try {
    let data = req.query;
    if (data.id == "undefined") {
      return res.json({
        status: false,
        message: "Id is undefined",
      });
    }
    const db = await mongo.happi_discount_connect();
    Store_managemntTb = await db.collection(TBL_Store_management);
    Employee_managemntTb = await db.collection(TBL_Employee_Management);
    let storeList = await Store_managemntTb.find(
      { store_employee: data.id },
      { projection: { store_code: 1, store_name: 1, address: 1, mobile: 1 } }
    ).toArray();
    let employeeManagementResponse = await Employee_managemntTb.find({
      _id: new ObjectId(data.id),
    }).toArray();
    logsService.log("debug", req, "GET STORE LIST", storeList);
    logsService.log(
      "debug",
      req,
      "GET EMPLOYEE DATE",
      employeeManagementResponse
    );
    return res.json({
      status: true,
      data: storeList,
      employeeManagementResponse: employeeManagementResponse,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: error,
    });
  }
}
//-------------------------------get list of brand names(unique brand names) -----------------------------------------//
app.get("/getBrandNames", getBrandNames);
async function getBrandNames(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    ApxProductTb = await db.collection(TBL_APX_PRODUCTS);
    let BrandResponse = await ApxProductTb.distinct("BRAND_NAME");
    return res.json({
      status: true,
      data: BrandResponse,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: error,
    });
  }
}
//---------------------------single select for brand names to get the item names------------------------------//
app.post("/getItemNames", getItemNames);
async function getItemNames(req, res) {
  let brandName = req.body.brandName;
  try {
    const db = await mongo.happi_discount_connect();
    ApxProductTb = await db.collection(TBL_APX_PRODUCTS);
    const apxData = await ApxProductTb.aggregate([
      {
        $match: {
          BRAND_NAME: brandName,
        },
      },
      {
        $project: {
          ITEM_NAME: 1,
          ITEM_CODE: 1,
        },
      },
    ]).toArray();
    return res.json({ status: true, message: apxData });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({ status: false, message: error });
  }
}
///------------------select storename and brand name and model to get price from apx api-----------------------------------------------///
app.post("/getDiscountPrice", getDiscountPrice);
async function getDiscountPrice(req, res) {
  try {
    let data = req.body;
    // console.log("data", data);
    const db = await mongo.happi_discount_connect();
    ManagerDiscountTb = await db.collection(TBL_Manager_Discount_Rules);
    ApxProductsTb = await db.collection(TBL_APX_Products);
    const currentDate = new Date();
    let managerRulesResponse = await ManagerDiscountTb.aggregate([
      {
        $match: {
          store: {
            $in: [data.store],
          },
          brand: {
            $in: [data.brand],
          },
          model: {
            $in: [data.model],
          },
          status: true,
        },
      },
    ]).toArray();

    //console.log("managerRulesResponse", managerRulesResponse)
    let ManagerRulesData = managerRulesResponse.filter((item) => {
      const fromDate = new Date(item.fromdate);
      const toDate = new Date(item.to_date);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      return fromDate <= currentDate && toDate >= currentDate;
    });
    let filteredDates = ManagerRulesData;
    // console.log("filteredDates", filteredDates?.length);
    if (managerRulesResponse?.length == 0) {
      return res.json({
        status: false,
        message: "This product cannot be discounted!!!",
      });
    }
    let getItemCode = await ApxProductsTb.findOne({ ITEM_NAME: data.model });

    if (getItemCode == null) {
      return res.json({
        status: false,
        message: "ITEM CODE NOT FOUND",
      });
    }
    let nearestToDate;
    if (filteredDates?.length == 1) {
      nearestToDate = filteredDates;
    } else {
      nearestToDate = filteredDates.filter(
        (item) => new Date(item.fromdate) <= new Date(item.to_date)
      );
      nearestToDate.sort((a, b) => {
        const dateA = new Date(a.to_date);
        const dateB = new Date(b.to_date);
        return Math.abs(dateA - currentDate) - Math.abs(dateB - currentDate);
      });
    }
    //console.log("nearestToDate", nearestToDate);
    logsService.log("debug", req, "DISCOUNT STEP-1", nearestToDate[0]);
    if (nearestToDate?.length == 0) {
      return res.json({
        status: false,
        message: "This product cannot be discounted!!!",
      });
    } else {
      let getAPXPrice =
        await getPriceFromPriceTemplate.getPriceFromPriceTemplate(
          getItemCode?.ITEM_CODE
        );
      // let getAPXPrice = getItemCode?.ITEM_PRICE;
      getAPXPrice = [
        {
          ITEM_CODE: getItemCode?.ITEM_CODE,
          ITEM_NAME: getItemCode?.ITEM_NAME,
          ITEM_PRICE: getItemCode?.ITEM_PRICE,
        },
      ];
      logsService.log("debug", req, "DISCOUNT PRICE STEP-2", getAPXPrice);
      return res.json({
        status: true,
        data: getAPXPrice,
        discount_type: nearestToDate[0]?.discount_type,
      });
    }
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: error,
    });
  }
}
//------------------ who can authorised by discount price based on ammount to get the authorised person ---------------------------------------------//
app.post("/authorisedDiscount", authorisedDiscount);
async function authorisedDiscount(req, res) {
  try {
    //console.log("req.body", req.body);
    const db = await mongo.happi_discount_connect();
    ManagerDiscountTb = await db.collection(TBL_Manager_Discount_Rules);
    ApxProductsTb = await db.collection(TBL_APX_Products);
    let managerRulesResponse = await ManagerDiscountTb.aggregate([
      {
        $match: {
          store: {
            $in: [req.body.store],
          },
          brand: {
            $in: [req.body.brand],
          },
          model: {
            $in: [req.body.model],
          },
          discount_type: {
            $eq: req.body.discount_type,
          },
        },
      },
    ]).toArray();
    // console.log("managerRulesResponse", managerRulesResponse?.length);
    const currentDate = new Date(); // Get the current date and time
    let ManagerRulesData = managerRulesResponse.filter((item) => {
      const fromDate = new Date(item.fromdate);
      const toDate = new Date(item.to_date);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      return fromDate <= currentDate && toDate >= currentDate;
    });
    let filteredDates = ManagerRulesData;

    // console.log("filteredDates", filteredDates?.length);
    if (filteredDates?.length == 0) {
      return res.json({
        status: false,
        message: "This product cannot be discounted!!!",
      });
    }
    let combinedRulesArray = [];
    for (let i = 0; i < filteredDates?.length; i++) {
      if (req.body.discount_type == "flat") {
        let flatArray = filteredDates[i]?.cash_discount_flat;
        combinedRulesArray = combinedRulesArray.concat(flatArray);
      } else {
        let percentageArray = filteredDates[i]?.cash_discount_percentage;
        combinedRulesArray = combinedRulesArray.concat(percentageArray);
      }
    }
    // console.log("Combined Rules Array:", combinedRulesArray);
    logsService.log(
      "debug",
      req,
      "DISCOUNT COMBINED RULES",
      combinedRulesArray
    );
    let rulesArray = combinedRulesArray;
    let filteredData;
    // console.log("filteredData", rulesArray);
    if (req.body.discount_type == "flat") {
      filteredData = rulesArray.find(
        (item) =>
          req.body.totalPrice >= parseInt(item.minhandsetprice) &&
          req.body.totalPrice <= parseInt(item.maxhandsetprice) &&
          req.body.discountPrice >= parseInt(item.mindiscountprice) &&
          req.body.discountPrice <= parseInt(item.maxdiscountprice)
      );
    } else if (req.body.discount_type == "percentage") {
      filteredData = rulesArray.find(
        (item) =>
          req.body.totalPrice >= parseInt(item.minhandsetprice) &&
          req.body.totalPrice <= parseInt(item.maxhandsetprice) &&
          req.body.discountPrice >= parseInt(item.lowerpercent) &&
          req.body.discountPrice <= parseInt(item.upperpercent)
      );
    }

    // console.log("filteredData", filteredData)
    logsService.log("debug", req, "DISCOUNT APPROVER AUTHORITY", filteredData);
    if (filteredData == undefined) {
      return res.json({
        status: false,
        message: "You are not authorised to give such a high discount !!!",
      });
    } else {
      return res.json({
        status: true,
        message: `This amount of discount has to be authorised by ${filteredData?.Approval_Authority}`,
        data: filteredData?.Approval_Authority,
      });
    }
  } catch (error) {
    logsService.log("error", req, error + "");
    console.log("error", error);
    return res.json({
      status: false,
      message: error,
    });
  }
}

//################ sending otp for that particular mobile number #############
app.post("/discountSendOtp", discountSendOtp);
async function discountSendOtp(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    DiscountSettingsTb = await db.collection(TBL_Discount_Settings);
    let settingResponse = await DiscountSettingsTb.findOne({
      key: "discount_otp_config",
    });
    if (settingResponse.is_otp) {
      const secret = OTP_SECRET + req.body.mobile;
      const token = otplib.authenticator.generate(secret);
      let message = `Happi Mobiles! Your OTP for user request login is: ${token}`;
      let sendOtpResponse = await otp.sendSMS(req.body.mobile, message);
      // console.log("sendOtpResponse", sendOtpResponse);
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
    } else {
      return res.json({
        status: false,
        message: "Otp is not required",
      });
    }
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "Errror",
    });
  }
}

//###################### Verify discount Otp #############################
app.post("/discountVerifyOtp", discountVerifyOtp);
async function discountVerifyOtp(req, res) {
  try {
    let data = req.body;
    const secret = OTP_SECRET + data.mobile;
    var verifyResponse = otplib.authenticator.check(data.otp, secret);
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
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}
//-------------------get sales head based on store name--------------------------------------------//
//get Cash Approver Drop down based on Authorised person and also store name//
app.post("/getCashApprover", getCashApprover);
async function getCashApprover(req, res) {
  try {
    let storeId = req.body.storeId;
    if (storeId == null || req.body.Approval_Authority == null) {
      return res.json({
        status: false,
        message: `${storeId} and ${req.body.Approval_Authority} fileds are mandatory`,
      });
    }
    const db = await mongo.happi_discount_connect();
    Store_managemntTb = await db.collection(TBL_Store_management);
    Employee_managemntTb = await db.collection(TBL_Employee_Management);
    let storeManagementResponse = await Store_managemntTb.findOne({
      _id: new ObjectId(storeId),
    });
    // console.log("storeManagementResponse", storeManagementResponse);
    let query = {};
    if (req.body.Approval_Authority == "asm") {
      query = {
        $match: { _id: new ObjectId(storeManagementResponse?.store_asm) },
      };
    } else if (req.body.Approval_Authority == "storehead") {
      const idArray = storeManagementResponse?.store_sales_head.map(
        (id) => new ObjectId(id)
      );
      query = { $match: { _id: { $in: idArray } } };
    } else if (req.body.Approval_Authority == "saleshead") {
      query = {
        $match: { _id: new ObjectId(storeManagementResponse?.sales_head) },
      };
    }
    // console.log("query", query);
    logsService.log("debug", req, "CASH APPROVER QUERY ", query);
    let employeeManagementResponse = await Employee_managemntTb.aggregate([
      query,
    ]).toArray();
    //  console.log("employeeManagementResponse", employeeManagementResponse);
    logsService.log(
      "debug",
      req,
      "DISCOUNT CASH APPROVER",
      employeeManagementResponse
    );
    return res.json({
      status: true,
      data: employeeManagementResponse,
    });
  } catch (error) {
    console.log("error", error);
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: error,
    });
  }
}

//######### Once  coupoun code will generate need to push that the coupoun code into Apx Api#############
async function pushCoupounCodeToApx(body) {
  const db = await mongo.happi_discount_connect();
  RedeemableVoucherTb = await db.collection(TBL_RedeemableVoucher);
  let start_date = body?.created_at?.slice(0, 10).replace(/-/g, "");
  let end_date = body?.discount_coupoun_expiresDate
    .toISOString()
    ?.slice(0, 10)
    .replace(/-/g, "");

  let PostRedeemableVoucherObj = {
    CompanyCode: "HM",
    PartnerName: "HAPPI UPDATE",
    VoucherCode: body?.discount_coupoun,
    VoucherValue: body?.discount_price,
    ValidStartDate: start_date,
    ValidEndDate: end_date,
    SystemInvoiceNo: "",
    SystemInvoiceDate: 0,
    CustomerId: "",
    CustomerName: "",
    CustomerContactNo: body?.customer_mobile,
    ApplicableType: "IMCO",
    ApplicableTypeValue: body?.apx_code,
  };
  // console.log("PostRedeemableVoucherObj", PostRedeemableVoucherObj);
  try {
    let voucherconfig = {
      method: "POST",
      url: "http://183.82.44.213/api/apxapi/PostRedeemableVoucher",
      headers: {
        UserId: "WEBSITE",
        SecurityCode: "3489-7629-9163-3979",
        "Content-Type": "application/json",
      },
      data: JSON.stringify(PostRedeemableVoucherObj),
    };
    let PostRedeemableVoucherResponse = await axios(voucherconfig);
    // console.log("PostRedeemableVoucherResponse", PostRedeemableVoucherResponse);
    PostRedeemableVoucherObj.response = PostRedeemableVoucherResponse?.data;
    await RedeemableVoucherTb.insertOne(PostRedeemableVoucherObj);
    return PostRedeemableVoucherResponse?.data;
  } catch (error) {
    console.log("error", error);
    logsService.log("error", req, error + "");
    return "ERROR";
  }
}

//---------------------------------------create discount  Api----------------------------------------------------//
//---------------------save discount Api and generate the coupoun code  ----------------
//#### need to generate DISCOUNT COUPOUN  with 10 digits
async function generateString(discountObj) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;
  let result = discountObj?.coupoun_code_prefix;
  let coupoun_length =
    discountObj?.coupoun_generation_limit -
    discountObj?.coupoun_code_prefix?.length;
  for (let i = 0; i < coupoun_length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  // console.log("result", result);
  return result;
}
//######### Generete REFERNCE number Unique value and store in DATABASE ######################//
const getNextSequenceValue = async (sequenceName) => {
  let dataBase = await mongo.happi_discount_connect();
  let discountRefcoll = await dataBase.collection("discount_reference");
  const sequenceDocument = await discountRefcoll.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { returnOriginal: false }
  );

  return sequenceDocument.value.seq;
};
// need to check the store bucket value and discount amount and need to update the store bucket value
async function checkCustomerMobileAndStoreBucketValidation(body, type) {
  console.log("body", body);
  const db = await mongo.happi_discount_connect();
  Store_managemntTb = await db.collection(TBL_Store_management);
  DiscountSettingsTb = await db.collection(TBL_Discount_Settings);
  Employee_managemntTb = await db.collection(TBL_Employee_Management);
  let discountSettingPrefix = await DiscountSettingsTb.find({
    key: "discount_coupoun_prefix",
  }).toArray();
  //##### need to save cash approverName ###############//
  let employeeManagementResponse = await Employee_managemntTb.findOne({
    _id: new ObjectId(body.cash_approver),
  });
  body.cash_approver_name = employeeManagementResponse?.name;
  let calculatedPrice;
  //##################### CALCULATE PRICE BASED ON TYPE ####################
  if (body.discount_type == "flat") {
    calculatedPrice = body.discount_price;
  } else if (body.discount_type == "percentage") {
    calculatedPrice = (body.total_price * body.discount_price) / 100;
    body.discount_total_price = body.total_price - parseInt(calculatedPrice);
  }
  //#################### GENERATE DISCOUNT COUPOUN BASED ON ADMIN GIVEN TO PREFIX AND LENGTH#############
  let discount_coupoun = await generateString(discountSettingPrefix[0]);
  //################## SAVE DISCOUNT COUPOUNS EXPIRES DATE ###########################
  let discount_coupoun_expiresDate = new Date();
  discount_coupoun_expiresDate.setDate(
    discount_coupoun_expiresDate.getDate() +
      discountSettingPrefix[0]?.coupoun_code_validate_date -
      1
  );
  //####need to check discount coupoun code already exits are not
  let checkCoupounCode = await SaveDiscountTb.findOne({
    discount_coupoun: discount_coupoun,
  });
  //####need to check the discount for  customer mobile number and model  if that discount status is Approved
  //## then only created discount otherwise discount wont be created.
  let checkCustomerMobile = await SaveDiscountTb.findOne({
    customer_mobile: body.customer_mobile,
    model: body.model,
    status: "awaiting",
  });
  //############ get store name Details ###########################//
  let getStoreName = await Store_managemntTb.findOne({
    _id: new ObjectId(body.store_id),
  });
  console.log("getStoreName", getStoreName);
  //### need to check the Store Bucket Amount Value (discount Price)
  // console.log("getStoreName?.store_name", getStoreName?.store_name);
  let checkStoreBucketDiscount = await StoreBucketTb.find({
    $and: [{ store_code: getStoreName?.store_code, status: true }],
  }).toArray();
  // console.log("checkStoreBucketDiscount", checkStoreBucketDiscount);
  //#### CHECK STORE BUCKET VALE FROM RANGES AND TO RANGES #################//
  const currentDate = new Date(); // Get the current date and time
  checkStoreBucketDiscount = checkStoreBucketDiscount.filter((item) => {
    const fromDate = new Date(item.start_date);
    const toDate = new Date(item.end_date);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
    return fromDate <= currentDate && toDate >= currentDate;
  });
  //#### HERE WE NEED TO CHECK THE ALL VALIDATION (CUSTOMER MOBILE NUMBER ALREADY EXITS,STORE BUCKET VALUE AMOUNT EXPIRES)####
  if (checkCustomerMobile != null) {
    return {
      status: false,
      message: "Already Discount Is Created for this Customer Mobile Number",
    };
  } else if (checkStoreBucketDiscount?.length == 0) {
    return {
      status: false,
      message: "Please Add the  Store Bucket value",
    };
  } else if (checkStoreBucketDiscount[0]?.amount < parseInt(calculatedPrice)) {
    return {
      status: false,
      message: "Store Bucket Value is Exceeded",
    };
  } else if (type == "equal") {
    //### IF CASE APPROVER PERSON AND LOGIN PAERSON BOTH ARE SAME THEN COUPOUN CODE AUTOMATICALLY GENERATED
    if (checkCoupounCode == null) {
      body.discount_coupoun = discount_coupoun;
      body.discount_coupoun_expiresDate = discount_coupoun_expiresDate;
      body.no_of_days_expires =
        discountSettingPrefix[0]?.coupoun_code_validate_date;
      body.status = "Approved";
      //##### SAVE UNIQUE REFERNECE NUMBER #####
      const reference = await getNextSequenceValue("reference");
      body.reference_no = `HAPDS000${reference}`;
      body.discount_price = parseInt(calculatedPrice);
      body.store_name = getStoreName?.store_name;
      body.coupoun_status = "not_used";
      // console.log("body", body);
      //## SAVE QUERY FOR DISCOUNT CREATION ################//
      logsService.log("debug", body, "DISCOUNT CREATION", body);
      await SaveDiscountTb.insertOne(body);
      let amount =
        checkStoreBucketDiscount[0]?.amount - parseInt(calculatedPrice);
      // #### UPDATE STORE BUCKET  WALLET AMOUNT #########//
      await StoreBucketTb.findOneAndUpdate(
        { store_name: getStoreName?.store_name },
        { $set: { amount: amount } }
      );
      // console.log("body", body);
      await pushCoupounCodeToApx(body);
      return { status: true, message: "Coupoun Code Generated Successfully" };
    } else {
      return { status: false, message: "Coupoun Code Already Generated" };
    }
  } else if (type == "notequal") {
    //#### IF CASE LOGIN PERSON AND CASH APPROVER ARE DIFFERENT PERSON JUST CREATE DISCOUNT
    const reference = await getNextSequenceValue("reference");
    //##### SAVE UNIQUE REFERNECE NUMBER #####
    body.reference_no = `HAPDS000${reference}`;
    body.discount_price = parseInt(calculatedPrice);
    body.store_name = getStoreName?.store_name;
    body.discount_coupoun_expiresDate = discount_coupoun_expiresDate;
    body.no_of_days_expires =
      discountSettingPrefix[0]?.coupoun_code_validate_date;
    //## SAVE QUERY FOR DISCOUNT CREATION ################//
    logsService.log("debug", body, "DISCOUNT CREATION", body);
    await SaveDiscountTb.insertOne(body);
    let amount =
      checkStoreBucketDiscount[0]?.amount - parseInt(calculatedPrice);
    // #### UPDATE STORE BUCKET  WALLET AMOUNT #########//
    await StoreBucketTb.findOneAndUpdate(
      { store_name: getStoreName?.store_name },
      { $set: { amount: amount } }
    );
    return { status: true, message: "Discount Created Successfully" };
  }
}
async function validationCreateDiscount(body) {
  const db = await mongo.happi_discount_connect();
  SaveDiscountTb = await db.collection(TBL_Save_Discount);
  StoreBucketTb = await db.collection(TBL_Store_Bucket);
  //### if created discount person and approver person both are same persons
  //##then while creating discount automatically generate the coupouns and status has beed changed to  Approved
  if (body.created_by === body.cash_approver) {
    let checkStoreAndMobile = await checkCustomerMobileAndStoreBucketValidation(
      body,
      "equal"
    );
    return checkStoreAndMobile;
  } else {
    let checkStoreAndMobile = await checkCustomerMobileAndStoreBucketValidation(
      body,
      "notequal"
    );
    return checkStoreAndMobile;
  }
}
/**1.Based on store ,brand,model and approver authority to create discount
 **2.if Approver Authority and Login Employee same the Coupoun code Automatically Generated.
 **3.Based on the  discount setting confiration to generate coupoun code eg:(HAPPI4547565)
 */
app.post("/createDiscount", createDiscount);
async function createDiscount(req, res) {
  try {
    // console.log("req.body", req.body);
    let body = req.body;
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    if (
      body.Approval_Authority == "asm" ||
      body.Approval_Authority == "saleshead"
    ) {
      body.approval_stage = "waiting_storehead_recommendation";
      Store_managemntTb = await db.collection(TBL_Store_management);
      let store_head_response = await Store_managemntTb.findOne({
        _id: new ObjectId(body.store_id),
      });
      body.store_head_ids = store_head_response?.store_sales_head; //store head ids
      let response = await validationCreateDiscount(body); //validations for  while creating Discount
      return res.json(response);
    } else {
      let response = await validationCreateDiscount(body); //validations for  while creating Discount
      return res.json(response);
    }
  } catch (error) {
    //  console.log("err", error);
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "error",
    });
  }
}
//############ --------------get Discount Aggregate Query--------------------------//
async function getDiscountAggregateQuery(query) {
  try {
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    let discountData = await SaveDiscountTb.aggregate([
      { $match: query },
      {
        $addFields: {
          storeObjectId: {
            $toObjectId: "$store_id",
          },
        },
      },
      {
        $addFields: {
          cash_approverObjectId: {
            $toObjectId: "$cash_approver",
          },
        },
      },
      {
        $lookup: {
          from: "discount_store_management",
          localField: "storeObjectId",
          foreignField: "_id",
          as: "storeoutput",
        },
      },
      {
        $lookup: {
          from: "discount_employee_management",
          localField: "cash_approver",
          foreignField: "_id",
          as: "cashApprover",
        },
      },
      {
        $project: {
          brand: 1,
          model: 1,
          total_price: 1,
          discount_price: 1,
          discount_total_price: 1,
          customer_mobile: 1,
          employee_id: 1,
          remarks: 1,
          created_at: 1,
          "storeoutput.store_code": 1,
          "storeoutput.store_name": 1,
          "cashApprover.name": 1,
          "cashApprover.emp_id": 1,
          status: 1,
          reference_no: 1,
          discount_coupoun: 1,
          id: 1,
          voucher_status: 1,
          invoice_no: 1,
          invoice_date: 1,
          coupoun_status: 1,
        },
      },
    ])
      .sort({ created_at: -1 })
      .toArray();
    return discountData;
  } catch (error) {
    logsService.log("error", req, error + "");
    return error;
  }
}
//------------------------------get Discount Details(list of discount Details) -------------------------------------------------//
app.get("/getDiscountList", getDiscountList);
async function getDiscountList(req, res) {
  try {
    let query = {};
    let discountData = await getDiscountAggregateQuery(query);
    return res.json({
      status: true,
      data: discountData,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: error,
    });
  }
}
//------------------------get Discount Rules based on approval ----------------------------------//
app.get("/getCreatedDiscount", getCreatedDiscount);
async function getCreatedDiscount(req, res) {
  try {
    let data = req.query;
    // console.log("data", data);
    let query = {};
    query = {
      $and: [
        { created_by: { $eq: data.id } },
        { status: { $eq: data.status } },
      ],
    };
    let approveDiscount = await getDiscountAggregateQuery(query);
    return res.json({
      status: true,
      awaitingApprovaldata: approveDiscount,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "error",
    });
  }
}
//-------------get list of ApproverDiscount---------------------------//
app.get("/getApproverDiscount", getApproverDiscount);
async function getApproverDiscount(req, res) {
  try {
    let data = req.query;
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(TBL_Employee_Management);
    let query = {};
    let employee_response = await Employee_managemntTb.findOne(
      { _id: new ObjectId(req.query.id) },
      { projection: { access_control: 1 } }
    );
    console.log(employee_response, employee_response);
    if (employee_response?.access_control?.includes("cashdiscountadmin")) {
      query = {
        $and: [{ status: { $eq: data.status } }],
      };
    } else {
      query = {
        $and: [
          { cash_approver: { $eq: data.id } },
          { status: { $eq: data.status } },
        ],
      };
    }

    console.log("query", query);

    let approveDiscount = await getDiscountAggregateQuery(query);
    return res.json({
      status: true,
      awaitingApprovaldata: approveDiscount,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "error",
    });
  }
}
//Approve Discount and generate coupoun code
app.put("/generateCoupounCode", generateCoupounCode);
async function generateCoupounCode(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    DiscountSettingsTb = await db.collection(TBL_Discount_Settings);
    let discountSettingPrefix = await DiscountSettingsTb.find({}).toArray();
    let discount_coupoun = await generateString(discountSettingPrefix[0]);
    // console.log("discount_coupoun", discount_coupoun);
    //need to check the coupoun
    let checkCoupounCode = await SaveDiscountTb.findOne({
      discount_coupoun: discount_coupoun,
    });
    //######### get discount and need to push coupoun code to Apx After generate coupoun code######
    let getDiscount = await SaveDiscountTb.findOne({
      id: req.body.id,
    });
    //########## check coupooun code in not bthere in datbase need to update status is Approved and that coupoun code nned to push apx##############
    if (checkCoupounCode == null) {
      await SaveDiscountTb.findOneAndUpdate(
        { id: req.body.id },
        {
          $set: {
            discount_coupoun: discount_coupoun,
            status: "Approved",
            coupoun_status: "not_used",
          },
        }
      );
      getDiscount.discount_coupoun = discount_coupoun;
      await pushCoupounCodeToApx(getDiscount); //call PostRedeemableVoucher
      logsService.log("debug", req, "APPROVE AND GENERATE COUPOUN CODE");
      return res.json({
        status: true,
        message: "Coupoun Code Generate Successfully",
      });
    } else {
      return res.json({
        status: false,
        message: "Coupoun Code Already Generated",
      });
    }
  } catch (error) {
    logsService.log("error", req, error + "");
    console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}
//Approve But not used
app.get("/approveButNotUsed", approveButNotUsed);
async function approveButNotUsed(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(TBL_Employee_Management);
    let employee_response = await Employee_managemntTb.findOne(
      { _id: new ObjectId(req.query.id) },
      { projection: { access_control: 1 } }
    );
    let query = {};
    if (employee_response?.access_control?.includes("cashdiscountadmin")) {
      query = {
        $and: [
          { status: { $eq: "Approved" } },
          { is_used: { $eq: false } },
          { coupoun_status: "not_used" },
        ],
      };
    } else {
      query = {
        $and: [
          { cash_approver: { $eq: req.query.id } },
          { status: { $eq: "Approved" } },
          { is_used: { $eq: false } },
          { coupoun_status: "not_used" },
        ],
      };
    }

    let approverDiscountButNotUsedResponse = await getDiscountAggregateQuery(
      query
    );
    return res.json({
      status: true,
      data: approverDiscountButNotUsedResponse,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//Approved and USED
app.get("/approvedAndUsed", approvedAndUsed);
async function approvedAndUsed(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(TBL_Employee_Management);
    let employee_response = await Employee_managemntTb.findOne(
      { _id: new ObjectId(req.query.id) },
      { projection: { access_control: 1 } }
    );
    let query = {};
    query = {
      $and: [{ status: { $eq: "used" } }, { coupoun_status: "used" }],
    };
    // if (employee_response?.access_control?.includes("cashdiscountadmin")) {
    //   query = {
    //     $and: [
    //       { status: { $eq: "used" } },
    //       { coupoun_status: "used" },
    //     ],
    //   };
    // } else {
    //   query = {
    //     $and: [
    //       { cash_approver: { $eq: req.query.id } },
    //       { status: { $eq: "used" } },
    //       { coupoun_status: "used" },
    //     ],
    //   };
    // }

    let approverDiscountAndUsedResponse = await getDiscountAggregateQuery(
      query
    );
    return res.json({
      status: true,
      data: approverDiscountAndUsedResponse,
      length: approverDiscountAndUsedResponse?.length,
    });
  } catch (error) {
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//My APPROVED AND USED IN STORE PANAL
app.get("/getMyApprovedAndUsed", getMyApprovedAndUsed);
async function getMyApprovedAndUsed(req, res) {
  try {
    let query = {};
    query = {
      $and: [
        { created_by: { $eq: req.query.id } },
        { status: { $eq: "used" } },
        { coupoun_status: "used" },
      ],
    };
    let getmyapproverDiscountAndUsedResponse = await getDiscountAggregateQuery(
      query
    );
    return res.json({
      status: true,
      data: getmyapproverDiscountAndUsedResponse,
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}
//recomndation approvers
app.get("/getrecommendationApprover", getrecommendationApprover);
async function getrecommendationApprover(req, res) {
  try {
    let query = {};
    query = {
      $and: [
        { approval_stage: { $eq: "waiting_storehead_recommendation" } },
        { store_head_ids: { $eq: req.query.id } },
      ],
    };
    let recommendationApproverResponse = await getDiscountAggregateQuery(query);
    return res.json({
      status: true,
      data: recommendationApproverResponse,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "ERRROR",
    });
  }
}
//submit recommendation Discount
app.put("/submitRecommendationDiscount", submitRecommendationDiscount);
async function submitRecommendationDiscount(req, res) {
  try {
    let data = req.body;
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    let getDiscountData = await SaveDiscountTb.find({ id: data.id }).toArray();
    // console.log("getDiscountData", getDiscountData);
    const filteredData = getDiscountData[0]?.rule?.cash_discount_flat.find(
      (item) =>
        getDiscountData[0]?.discount_price >= item.mindiscountprice &&
        getDiscountData[0]?.discount_price <= item.maxdiscountprice
    );
    // console.log("filteredData", filteredData);
    //asm range lo kani unta approvel if no recommamnded
    if (filteredData?.Approval_Authority == "asm") {
      //we need to update statue awaiting
      SaveDiscountTb.findOneAndUpdate(
        { id: data.id },
        { $set: { status: "awaiting" } }
      );
    } else if (filteredData?.Approval_Authority == "saleshead") {
      //need to show the recommendation
      SaveDiscountTb.findOneAndUpdate(
        { id: data.id },
        { $set: { status: "awaiting" } }
      );
    } else {
      SaveDiscountTb.findOneAndUpdate(
        { id: data.id },
        { $set: { approval_stage: "waiting_storehead_recommendation" } }
      );
    }
    return res.json({
      status: true,
      message: "Approver Recommendation Successfully",
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}
//get history data (discount Reject + approved + awaiting list)
app.get("/getHistoryDiscount", getHistoryDiscount);
async function getHistoryDiscount(req, res) {
  try {
    let data = req.query;
    // console.log("data", data);
    let query = {};
    query = { $and: [{ created_by: { $eq: data.id } }] };
    if (
      req.query.reference_no != null &&
      req.query.reference_no != "" &&
      req.query.reference_no != "null" &&
      req.query.reference_no != undefined
    ) {
      // query.reference_no = req.query.reference_no
      query.reference_no = { $regex: req.query.reference_no, $options: "si" };
    }
    let approveDiscount = await getDiscountAggregateQuery(query);
    return res.json({
      status: true,
      awaitingApprovaldata: approveDiscount,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "error",
    });
  }
}
//percentage calucation
app.post("/discountCalculation", discountCalculation);
async function discountCalculation(req, res) {
  let calculatedata;
  try {
    if (req.body.discount_type == "flat") {
      calculatedata = req.body.total_price - req.body.discount_price;
    } else if (req.body.discount_type == "percentage") {
      calculatedata = (req.body.total_price * req.body.discount_price) / 100;
      calculatedata = req.body.total_price - calculatedata;
    }
    return res.json({
      status: true,
      data: calculatedata,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

app.get("/getDiscountReferenceDetails", getDiscountReferenceDetails);
async function getDiscountReferenceDetails(req, res) {
  try {
    let query = {};
    query.reference_no = req.query.reference_no;
    let usedDiscount = await getDiscountAggregateQuery(query);
    return res.json({
      status: true,
      usedDiscountdata: usedDiscount,
    });
  } catch (error) {
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

module.exports = app;
