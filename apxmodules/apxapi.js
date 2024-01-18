let axios = require("axios");
let date = new Date();
let getYear = date.getFullYear().toString();
var qs = require("qs");
let month = date.getMonth() + 1;
if (month.toString().length > 1) {
  month = month.toString();
} else {
  month = "0" + month;
}

let day = date.getDate();
if (day.toString().length > 1) {
  day = day.toString();
} else {
  day = "0" + day;
}
let dateInput = getYear + month + day;
//################ GET LATEST PRICE FROM APX APIS WHEN YOUR PASSING ITEM CODE ####################
async function getPriceFromPriceTemplate(ItemCode) {
  var queryData = {
    CompanyCode: "HM",
    ItemCode: ItemCode,
    PriceTemplate: "MINIMUM PRICE",
    PriceEffetiveFrom: dateInput,
  };
  var query = qs.stringify(queryData);
  let getPriceconfig = {
    method: "get",
    maxBodyLength: Infinity,
    url: "http://183.82.44.213/api/apxapi/GetPriceFromPriceTemplate?" + query,
    headers: {
      UserId: "WEBSITE",
      SecurityCode: "3489-7629-9163-3979",
    },
  };
  let priceResponse = await axios(getPriceconfig);
  return priceResponse?.data?.Table;
}

//###################### GET LATEST BRANCHES(STORE NAMES) FROM APX APIS #############################
async function getBranchInfoDetails() {
  let getBranchConfig = {
    method: "get",
    maxBodyLength: Infinity,
    url: "http://183.82.44.213/api/apxapi/GetBranchInfo?CompanyCode=HM&BranchCity=0&BranchPinCode=0&BranchState=0&StoreOpenStartDate=0&StoreOpenEndDate=0&ModifiedOnStartDate=0&ModifiedOnEndDate=0&Status=All",
    headers: {
      UserId: "WEBSITE",
      SecurityCode: "3489-7629-9163-3979",
    },
  };
  let BranchResponse = await axios(getBranchConfig);
  //console.log("BranchResponse", BranchResponse)
  return BranchResponse?.data?.Data;
}

//####################### GET EMPLOYEEE DETAILS FROM APX APIS ##################################
async function getEmployeeeDetails() {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "http://183.82.44.213/api/apxapi/GetSalespersonMasterInfo?CompanyCode=HM",
    headers: {
      UserId: "WEBSITE",
      SecurityCode: "3489-7629-9163-3979",
    },
  };
  let response = await axios(config);
  return response?.data?.Data;
}

//############################# GET MODEL (APX PRODUCTS) FROM APX APIS ###########################
async function getModelInfoDetails() {
  try {
    let modelconfig = {
      method: "get",
      maxBodyLength: Infinity,
      url: "http://183.82.44.213/api/apxapi/GetItemModelInfo?CompanyCode=HM&Product=0&Brand=0&ItemCategory=0&CreatedOnStartDate=0&CreatedOnEndDate=0&ModifiedOnStartDate=0&ModifiedOnEndDate=0&ItemNameLike=0&Status=All&ItemClassificationType=NONE&ItemClassificationValue=0",
      headers: {
        UserId: "WEBSITE",
        SecurityCode: "3489-7629-9163-3979",
      },
    };
    let Itemresponse = await axios(modelconfig);
    return Itemresponse?.data?.Data;
  } catch (error) {
    return res.json({
      status: true,
      message: "ERROR",
    });
  }
}
module.exports.getPriceFromPriceTemplate = getPriceFromPriceTemplate;
module.exports.getBranchInfoDetails = getBranchInfoDetails;
module.exports.getEmployeeeDetails = getEmployeeeDetails;
module.exports.getModelInfoDetails = getModelInfoDetails;
