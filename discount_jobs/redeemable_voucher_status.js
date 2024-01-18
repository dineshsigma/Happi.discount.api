let express = require("express");
const mongo = require("../db.js");
let app = express();
let axios = require("axios");
const { ObjectId } = require('mongodb');
const TBL_Save_Discount = "save_discount";
let SaveDiscountTb = null;
//############ this function saya that after generating the coupoun need to push that
//coupoun code to postReaddmle Api  to get the status of coupoun is used or not?
app.get("/getRedeemableVoucherStatus", getRedeemableVoucherStatus);
async function getRedeemableVoucherStatus(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    // let query = { voucher_status: { $exists: false }, status: "Approved" };
    let query = { coupoun_status: "not_used", status: "Approved" };
    //let query = { status: "Approved" };
    let discountData = await SaveDiscountTb.find(query).toArray();
    for (var i = 0; i < discountData?.length; i++) {
      let discountItem = discountData[i];
      let getRedeemableconfig = {
        method: "get",
        maxBodyLength: Infinity,
        url: `http://183.82.44.213/api/apxapi/GetRedeemableVoucherStatus?CompanyCode=HM&VoucherCode=${discountItem?.discount_coupoun}`,
        headers: {
          UserId: "WEBSITE",
          SecurityCode: "3489-7629-9163-3979",
          "Content-Type": "application/json",
        },
      };
      let getRedeemableVoucherStatusRes = await axios(getRedeemableconfig);
      // console.log(
      //   "getRedeemableVoucherStatusRes",
      //   getRedeemableVoucherStatusRes?.data?.Data[0]
      // );
      if (getRedeemableVoucherStatusRes?.data?.Data?.length > 0) {
        await SaveDiscountTb.updateOne(
          { _id: new ObjectId(discountItem?._id) },
          {
            $set: {
              voucher_status:
                getRedeemableVoucherStatusRes?.data?.Data[0]?.VoucherStatus,
              invoice_no:
                getRedeemableVoucherStatusRes?.data?.Data[0]?.INVOICE_NO,
              invoice_date:
                getRedeemableVoucherStatusRes?.data?.Data[0]?.INVOICE_DATE,
              coupoun_status:
                getRedeemableVoucherStatusRes?.data?.Data[0]?.INVOICE_DATE == 0
                  ? "not_used"
                  : "used",
              status:
                getRedeemableVoucherStatusRes?.data?.Data[0]?.INVOICE_DATE == 0
                  ? "Approved"
                  : "used",
            },
          }
        );
      }
    }
    return res.json({
      status: true,
      message: "voucher Code  Updated Successfully",
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
