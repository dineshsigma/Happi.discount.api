let express = require("express");
let app = express();
let mongo = require("../db.js");
let branch = require("../apxmodules/apxapi.js");

//##################### STORES SYNC ###########################//
app.post("/stockTransferStoresSync", stockTransferStoresSync);
async function stockTransferStoresSync(req, res) {
  try {
    let dataBase = await mongo.connect();
    let store_tb = await dataBase.collection("stores");
    let getBranchDetails = await branch.getBranchInfoDetails();
    let bulk_write_commands = [];
    for (var i = 0; i < getBranchDetails?.length; i++) {
      let storeObj = {
        store_code: getBranchDetails[i]?.BRANCH_CODE?.toUpperCase(),
        store_name: getBranchDetails[i].BRANCH_NAME?.toUpperCase(),
        store_sync_date: new Date(),
      };
      bulk_write_commands.push({
        updateOne: {
          filter: {
            store_code: getBranchDetails[i]?.BRANCH_CODE?.toUpperCase(),
          },
          update: {
            $set: storeObj,
          },
          upsert: true,
        },
      });
    }
    await store_tb.bulkWrite(bulk_write_commands);
    return res.json({
      status: true,
      message: "Success",
    });
  } catch (error) {
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//##################### STOCK TRANSFER MODEL SYNC ###########################//
app.post("/stockTransferModelSync", stockTransferModelSync);
async function stockTransferModelSync(req, res) {
  try {
    let dataBase = await mongo.connect();
    let stock_tf_apx_tb = await dataBase.collection(
      "stock_transfer_apx_products"
    );
    let getItemDetails = await branch.getModelInfoDetails();
    let bulk_write_commands = [];
    for (var i = 0; i < getItemDetails?.length; i++) {
      bulk_write_commands.push({
        updateOne: {
          filter: { ITEM_CODE: getItemDetails[i]?.ITEM_CODE },
          update: {
            $set: {
              BRAND_NAME: getItemDetails[i]?.BRAND_NAME,
              ITEM_NAME: getItemDetails[i]?.ITEM_NAME,
              ITEM_CODE: getItemDetails[i]?.ITEM_CODE,
              PROD_CATG_NAME: getItemDetails[i]?.PROD_CATG_NAME,
              PRODUCT_NAME: getItemDetails[i]?.PRODUCT_NAME,
              ITEM_STATUS: getItemDetails[i]?.ITEM_STATUS,
              CREATED_ON: getItemDetails[i]?.CREATED_ON,
              MODEL_SYNC_DATE: new Date(),
            },
          },
          upsert: true,
        },
      });
    }
    await stock_tf_apx_tb.bulkWrite(bulk_write_commands);
    return res.json({
      status: true,
      message: "Products Addedd successfully",
      successCount: getItemDetails?.length,
    });
  } catch (error) {
    console.log("ERROR");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

module.exports = app;
