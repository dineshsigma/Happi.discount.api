let axios = require("axios");
var qs = require("qs");

async function IMEICurrentStatus(data) {
  try {
    let queryData = {
      CompanyCode: "HM",
      ImeiSerialNo: data.imei_serial_no,
    };
    var query = qs.stringify(queryData);
    let getIMEIconfig = {
      method: "get",
      maxBodyLength: Infinity,
      url:
        "http://183.82.44.213/api/apxapi/GetImeiSerialNoCurrentStatus?" + query,
      headers: {
        UserId: "WEBSITE",
        SecurityCode: "3489-7629-9163-3979",
      },
    };
    let get_IMEI_details = await axios(getIMEIconfig);
    return get_IMEI_details?.data?.Data;
  } catch (error) {
    return "error";
  }
}
module.exports.IMEICurrentStatus = IMEICurrentStatus;
