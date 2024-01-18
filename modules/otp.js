var axios = require("axios");
var generateUuidModule = require("./generateuuid.js");
const { response } = require("../ticket.js");
// send sms
async function sendSMS(phone, message) {
  var JOB_ID = generateUuidModule.createUUID();
  var options = {
    method: "POST",
    url: `http://www.mobiglitz.com/vb/apikey.php?apikey=elLRJiD2DbDj0afc&senderid=HLOMOB&number=91${phone}&message=${encodeURI(
      message
    )}`,
    headers: {
      "Content-Type": "application/json",
    },
  };
  console.log("SMS TRIGGER", JOB_ID, JSON.stringify(options));
  let otpResponse = await axios(options);
  return otpResponse?.data?.status;
  
}

module.exports.sendSMS = sendSMS;

//sendSMS("8106838432", "Thankyou for placing order in Happi Mobiles. Your order is underprocess for more information click LINK");
