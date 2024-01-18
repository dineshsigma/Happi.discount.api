let express = require("express");
const mongo = require("../../db.js");
let logsService = require("../../logservice.js");
const Joi = require("joi");
let app = express();
const { ObjectId } = require("mongodb");
const TBL_Employee_management = "discount_employee_management";
const TBL_Discount_Manager_Rules = "discount_manager_rules";
const TBL_Store_management = "discount_store_management";
let Employee_managementTb = null;
let Store_managemetTb = null;
let Discount_ManagerRuleTb = null;

// ################  get list of manager Discount Rules
app.get("/getManagerDiscountRules", getManagerDiscountRules);
async function getManagerDiscountRules(req, res) {
  try {
    let query = {};
    if (
      req.query.name != null &&
      req.query.name != undefined &&
      req.query.name != "null" &&
      req.query.name != ""
    ) {
      query.rule_name = { $regex: req.query.name, $options: "si" };
      query.status = { $eq: JSON.parse(req.query.status) };
    } else {
      query.status = { $eq: JSON.parse(req.query.status) };
    }
    const db = await mongo.happi_discount_connect();
    Employee_managementTb = await db.collection(TBL_Employee_management);
    Store_managemetTb = await db.collection(TBL_Store_management);
    Discount_ManagerRuleTb = await db.collection(TBL_Discount_Manager_Rules);
    let manager_discount_rules_response =
      await Discount_ManagerRuleTb.aggregate([
        {
          $match: query,
        },
        {
          $addFields: {
            store: {
              $map: {
                input: "$store",
                in: { $toObjectId: "$$this" },
              },
            },
          },
        },
        {
          $lookup: {
            from: "discount_store_management",
            localField: "store",
            foreignField: "_id",
            as: "storeoutput",
          },
        },
      ])
        .sort({ unique_rule_name: 1 })
        .toArray();
    return res.json({
      status: true,
      data: manager_discount_rules_response,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}
//edit rule
app.put("/editRule", editRule);
async function editRule(req, res) {
  try {
    let data = req.body;
    let id = req.body.id;
    const db = await mongo.happi_discount_connect();
    Discount_ManagerRuleTb = await db.collection(TBL_Discount_Manager_Rules);
    delete data.id;
    // console.log("data", data);
    // console.log("reqqq", id)
    await Discount_ManagerRuleTb.updateOne({ id: id }, { $set: data });
    return res.json({
      status: true,
      message: "Rule updated successfully",
    });
  } catch (error) {
    // console.log("error", error);
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//get managerRule by id
app.get("/getManagerRuleById", getManagerRuleById);
async function getManagerRuleById(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    Discount_ManagerRuleTb = await db.collection(TBL_Discount_Manager_Rules);
    let ruleByIdResponse = await Discount_ManagerRuleTb.findOne(
      { id: req.query.id },
      { projection: { cash_discount_flat: 1 } }
    );
    return res.json({
      status: true,
      data: ruleByIdResponse,
    });
  } catch (error) {
    // console.log("error", error);
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//check validation Rule name
app.post("/checkValidationRuleName", checkValidationRuleName);
async function checkValidationRuleName(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    Discount_ManagerRuleTb = await db.collection(TBL_Discount_Manager_Rules);
    let unique_rule_name = req.body.rule_name
      ?.trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
    let rulesResponse = await Discount_ManagerRuleTb.findOne({
      unique_rule_name: unique_rule_name,
    });
    if (rulesResponse == null) {
      return res.json({
        status: true,
        message: "Success",
      });
    } else {
      return res.json({
        status: false,
        message: "Rule Name Already Exits",
      });
    }
  } catch (error) {
    // console.log("error", error);
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}
app.post("/updateCashDiscountFlat", updateCashDiscountFlat);
async function updateCashDiscountFlat(req, res) {
  // console.log("req.body", req.body)
  try {
    const id = req.body.id;
    const object = { ...req.body };
    // console.log("object", object);
    delete object.id;
    const db = await mongo.happi_discount_connect();
    ManagerDiscountTb = await db.collection(TBL_Discount_Manager_Rules);
    let updateResult;
    logsService.log("debug", req, "UPDATE RULES", object);
    if (req.body.discount_type == "flat") {
      updateResult = await ManagerDiscountTb.updateOne(
        { id },
        { $push: { cash_discount_flat: object } }
      );
    } else if (req.body.discount_type == "percentage") {
      updateResult = await ManagerDiscountTb.updateOne(
        { id },
        { $push: { cash_discount_percentage: object } }
      );
    }

    if (updateResult.modifiedCount > 0) {
      res.json({ status: true, message: "Updated successfully" });
    } else {
      res.json({ status: false, message: "Document not found" });
    }
  } catch (error) {
    // console.log("error", error);
    logsService.log("error", req, error + "");
    res.json({ status: false, message: "error" });
  }
}

//##############3validation for rules#####################################//
//############ SCHEMA FOR RULE CREATION ARRAY ############################//

app.post("/validateRules", validateRules);
async function validateRules(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    Discount_ManagerRuleTb = await db.collection(TBL_Discount_Manager_Rules);
    logsService.log("debug", req, "VALIDATE AND CREATE RULES", req.body);
    let discount_type;
    if (req.body.discount_type == "flat") discount_type = "percentage";
    if (req.body.discount_type == "percentage") discount_type = "flat";
    let rulesResponse = await Discount_ManagerRuleTb.aggregate([
      {
        $match: {
          store: {
            $in: req.body.store,
          },
          brand: {
            $in: req.body.brand,
          },
          model: {
            $in: req.body.model,
          },
          discount_type: {
            $eq: discount_type,
          },
        },
      },
    ]).toArray();

    const filteredData = rulesResponse.filter((item) => {
      const itemFromDate = new Date(item.fromdate);
      const itemToDate = new Date(item.to_date);
      const filterFromDate = new Date(req.body.fromdate);
      const filterToDate = new Date(req.body.to_date);

      if (itemFromDate <= filterToDate && itemToDate >= filterFromDate) {
        return true;
      } else {
        return false;
      }
    });
    // console.log("filteredData", filteredData);
    if (filteredData?.length > 0) {
      logsService.log("debug", req, "ALREADY EXITS", filteredData);
      return res.json({
        status: false,
        message: "Already Rule is Exits",
      });
    } else {
      logsService.log(
        "debug",
        req,
        "VALIDATE AND CREATE AND UPDATE RULES",
        filteredData
      );
      await Discount_ManagerRuleTb.updateOne(
        { id: req.body.id },
        {
          $set: req.body,
        },
        { upsert: true }
      );
      return res.json({
        status: true,
        message: "Rule Created Successfully",
      });
    }
  } catch (error) {
    console.log("error", error);
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}
app.post("/editRuleArray", editRuleArray);
async function editRuleArray(req, res) {
  try {
    // console.log("req.body", req.body)
    const db = await mongo.happi_discount_connect();
    Discount_ManagerRuleTb = await db.collection(TBL_Discount_Manager_Rules);
    let response = await Discount_ManagerRuleTb.findOne({ id: req.body.id });
    if (response == null) {
      return res.json({
        status: false,
        message: "NO DATA FOUND",
      });
    }
    let data;
    if (req.body.discount_type == "flat") {
      data = response?.cash_discount_flat;
      for (const objToUpdate of req.body.update_rule_flat) {
        const index = data.findIndex(
          (item) => item.flat_id === objToUpdate.flat_id
        );
        if (index !== -1) {
          data[index] = { ...data[index], ...objToUpdate };
        } else {
          data[index] = { ...data[index] };
        }
      }
      logsService.log("debug", req, "EDIT  RULES", data);
      await Discount_ManagerRuleTb.updateOne(
        { id: req.body.id },
        { $set: { cash_discount_flat: data } }
      );
    } else if (req.body.discount_type == "percentage") {
      data = response?.cash_discount_percentage;
      for (const objToUpdate of req.body.update_rule_percentage) {
        const index = data.findIndex(
          (item) => item.percentage_id === objToUpdate.percentage_id
        );
        if (index !== -1) {
          data[index] = { ...data[index], ...objToUpdate };
        } else {
          data[index] = { ...data[index] };
        }
      }
      logsService.log("debug", req, "EDIT  RULES", data);
      await Discount_ManagerRuleTb.updateOne(
        { id: req.body.id },
        { $set: { cash_discount_percentage: data } }
      );
    }
    return res.json({
      status: true,
      message: "Rule Updated Successfully",
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

//delete ruleArray
app.post("/deleteruleArray", deleteRuleArray);
async function deleteRuleArray(req, res) {
  console.log("req.body", req.body);
  try {
    const db = await mongo.happi_discount_connect();
    Discount_ManagerRuleTb = await db.collection(TBL_Discount_Manager_Rules);
    let response = await Discount_ManagerRuleTb.findOne({ id: req.body.id });
    if (response == null) {
      return res.json({
        status: false,
        message: "NO DATA FOUND",
      });
    }

    let data;
    if (req.body.discount_type == "flat") {
      data = response?.cash_discount_flat;
      data = data.filter((item, index) => {
        return item.flat_id !== req.body.removeObj?.flat_id;
      });
      logsService.log("debug", req, "REMOVE  RULES", data);
      await Discount_ManagerRuleTb.updateOne(
        { id: req.body.id },
        { $set: { cash_discount_flat: data } }
      );
    } else if (req.body.discount_type == "percentage") {
      data = response?.cash_discount_percentage;
      data = data.filter((item, index) => {
        return item.percentage_id !== req.body.removeObj.percentage_id;
      });
      logsService.log("debug", req, "REMOVE  RULES", data);
      await Discount_ManagerRuleTb.updateOne(
        { id: req.body.id },
        { $set: { cash_discount_percentage: data } }
      );
    }
    return res.json({
      status: true,
      message: "Rule deleted successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "ERRRO",
    });
  }
}

//GET BY ID
app.get("/getmanagerRulesById", getmanagerRulesById);
async function getmanagerRulesById(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    Discount_ManagerRuleTb = await db.collection(TBL_Discount_Manager_Rules);
    let get_rule_data = await Discount_ManagerRuleTb.aggregate([
      {
        $match: {
          id: req.query.id,
        },
      },
      {
        $addFields: {
          store: {
            $map: {
              input: "$store",
              in: { $toObjectId: "$$this" },
            },
          },
        },
      },
      {
        $lookup: {
          from: "discount_store_management",
          localField: "store",
          foreignField: "_id",
          as: "storeoutput",
        },
      },
      {
        $project: {
          rule_name: 1,
          brand: 1,
          model: 1,
          fromdate: 1,
          to_date: 1,
          status: 1,
          created_at: 1,
          discount_category: 1,
          discount_type: 1,
          cash_discount_flat: 1,
          cash_discount_percentage: 1,
          updated_at: 1,
          storeoutput: {
            $map: {
              input: "$storeoutput",
              in: {
                store_name: "$$this.store_name",
                _id: "$$this._id",
              },
            },
          },
        },
      },
    ]).toArray();
    return res.json({
      status: true,
      data: get_rule_data,
    });
  } catch (error) {}
}
module.exports = app;
