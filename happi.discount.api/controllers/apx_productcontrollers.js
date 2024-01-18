let express = require("express");
const mongo = require("../../db.js");
let app = express();
const TBL_APX_PRODUCTS = "apx_product";
let ApxProductTb = null;
//-------------------------------------------get Brand names------------------------------------------//
app.get("/getBrandList", getBrandList);
async function getBrandList(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    ApxProductTb = await db.collection(TBL_APX_PRODUCTS);
    let apxData = await ApxProductTb.aggregate([
      {
        $match: { enable: true },
      },
      {
        $group: {
          _id: "$BRAND_NAME",
          id: { $first: "$_id" },
        },
      },
      {
        $project: {
          _id: "$id",
          BRAND_NAME: "$_id",
        },
      },
    ]).toArray();
    return res.json({
      status: true,
      data: apxData,
    });
  } catch (error) {
    return res.json({
      status: false,
      message: error,
    });
  }
}

//----------------------------------------Filter item_names passing brand_names -------------------------------------//
app.post("/getItemNames", getItemNames);
async function getItemNames(req, res) {
  let brandName = req.body.brandName;
  console.log("brandName", brandName);
  try {
    const db = await mongo.happi_discount_connect();
    ApxProductTb = await db.collection(TBL_APX_PRODUCTS);
    const apxData = await ApxProductTb.aggregate([
      {
        $match: {
          BRAND_NAME: {
            $in: brandName,
          },
          enable: true,
        },
      },

      {
        $project: {
          ITEM_NAME: 1,
        },
      },
    ]).toArray();
    res.json({ status: true, message: apxData });
  } catch (error) {
    res.json({ status: false, message: error });
  }
}
module.exports = app;
