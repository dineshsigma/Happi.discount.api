let express = require("express");
let app = express();
let mongo = require("../db.js");
let logsService = require("../logservice.js");
const { v4: uuidv4 } = require("uuid");

app.post("/packedDamagedProducts", packedDamagedProducts);
async function packedDamagedProducts(req, res) {
  try {
    let data = req.body;
    let dataBase = await mongo.connect();
    let sale_return_packing_tb = await dataBase.collection(
      "sale_return_damaged_products"
    );
    let sale_return_tb = await dataBase.collection("sale_return");
    let bulk_write_commands = [];
    if (req.body.damaged_products.length >= 5) {
      data.created_date = new Date();
      data.id = uuidv4();
      await sale_return_packing_tb.insertOne(data);
      for (let i = 0; i < req.body.damaged_products?.length; i++) {
        bulk_write_commands.push({
          updateOne: {
            filter: {
              id: req.body.damaged_products[i]?.id,
            },
            update: {
              $set: {
                status: "In-transist",
                delivary_through: req.body.delivary_through,
                person_details: req.body.person_details,
                attachment: req.body.attachment,
                product_attachments: req.body.product_attachments,
              },
            },
            upsert: true,
          },
        });
      }
      await sale_return_tb.bulkWrite(bulk_write_commands);
      return res.json({
        status: true,
        message: "Damaged products  Saved Successfully",
      });
    } else {
      return res.json({
        status: false,
        message: "PLEASE SELECT  MINIMUM FIVE PRODUCTS",
      });
    }
  } catch (error) {
    console.log("ERROR", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//########### GET LIST OF DAMAGED PRODUCTS ##############################

app.get("/getDamagedproducts", getDamagedproducts);
async function getDamagedproducts(req, res) {
  try {
    let dataBase = await mongo.connect();
    let sale_return_tb = await dataBase.collection("sale_return");
    let get_damaged_products = await sale_return_tb
      .find({ status: "ReturnedToCustomer", created_by: req.query.created_by })
      .toArray();
    return res.json({
      status: true,
      data: get_damaged_products,
    });
  } catch (error) {
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//################# RECEIVED DAMAGED PRODUCTS ###########################
app.post("/receivedDamagedProducts", receivedDamagedproducts);
async function receivedDamagedproducts(req, res) {
  try {
    logsService.sale_returnlog(
      "debug",
      req,
      `RECEIVED DAMAGED PRODUCT PAYLOAD`,
      req.body
    );

    let dataBase = await mongo.connect();
    let sale_return_packing_tb = await dataBase.collection(
      "sale_return_damaged_products"
    );
    let sale_return_tb = await dataBase.collection("sale_return");
    await sale_return_packing_tb.updateOne(
      { id: req.body.id },
      {
        $set: {
          status: "Received",
          received_damaged_produts_admin_details: {
            emp_id: req.body.emp_id,
            name: req.body.name,
            mobile: req.body.mobile,
          },
        },
      }
    );
    let bulk_write_commands = [];
    for (let i = 0; i < req.body.damaged_products?.length; i++) {
      bulk_write_commands.push({
        updateOne: {
          filter: {
            id: req.body.damaged_products[i]?.id,
          },
          update: {
            $set: {
              status: "Received",
              received_damaged_produts_admin_details: {
                emp_id: req.body.emp_id,
                name: req.body.name,
                mobile: req.body.mobile,
              },
            },
          },
          upsert: true,
        },
      });
    }
    await sale_return_tb.bulkWrite(bulk_write_commands);
    return res.json({
      status: true,
      message: "Damaged products Successfully Received",
    });
  } catch (error) {
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

module.exports = app;
