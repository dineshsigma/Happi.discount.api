let axios = require("axios");
var qs = require("qs");

async function checkStock(data) {
  try {
    let queryData = {
      CompanyCode: "HM",
      ItemCode: data.item_code,
      BranchCode: data.store,
      AsonDate: 0,
      Brand: data.brand,
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
    // console.log("get_stock_info", get_stock_info?.data?.Data);
    return get_stock_info?.data?.Data;
  } catch (error) {
    return "error";
  }
}

module.exports.checkStock = checkStock;
