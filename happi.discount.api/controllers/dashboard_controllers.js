let express = require("express");
const mongo = require("../../db.js");
const { ObjectId } = require("mongodb");
let logsService = require("../../logservice.js");
let app = express();
const TBL_Save_Discount = "save_discount";
const TBL_Employee_management = "discount_employee_management";
const TBL_Store_management = "discount_store_management";
let SaveDiscountTb = null;
let Employee_managemntTb = null;
let Store_managemntTb = null;
let from = new Date();
from.setHours(0, 0, 0, 0);
let to = new Date();
to.setHours(23, 59, 59, 999);
from.setDate(from.getDate() - 7);

async function aggregationQueryCount(query) {
  try {
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    let todayCount = await SaveDiscountTb.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: {},
          totalcount: { $sum: 1 },
          Approved: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Approved"] },
                then: 1,
                else: 0,
              },
            },
          },
          Rejected: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Reject"] },
                then: 1,
                else: 0,
              },
            },
          },
          awaiting: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "awaiting"] },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
    ]).toArray();
    return todayCount;
  } catch (error) {
    return "error";
  }
}

app.get("/dashboardData", dashboardData);
async function dashboardData(req, res) {
  try {
    let id = req.query.id;
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(TBL_Employee_management);
    let employeeResponse = await Employee_managemntTb.findOne({
      _id: new ObjectId(id),
    });
    let isAdmin =
      employeeResponse?.access_control.includes("cashdiscountadmin");
    let from = new Date();
    from.setHours(0, 0, 0, 0);
    let to = new Date();
    to.setHours(23, 59, 59, 999);
    let query = {};
    query.created_at = { $gt: from.toISOString(), $lte: to.toISOString() };
    let todayCount = await aggregationQueryCount(query);
    from.setDate(from.getDate() - 7);
    query.created_at = { $gt: from.toISOString(), $lte: to.toISOString() };
    let lastSevenDaysCount = await aggregationQueryCount(query);
    from = new Date();
    to = new Date();
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    from.setDate(1);
    query.created_at = { $gt: from.toISOString(), $lte: to.toISOString() };
    let ThisMonthCount = await aggregationQueryCount(query);
    to.setHours(0, 0, 0, 0);
    to.setDate(1);
    from.setMonth(from.getMonth() - 1);
    query.created_at = { $gt: from.toISOString(), $lte: to.toISOString() };
    let lastMonthCount = await aggregationQueryCount(query);

    return res.json({
      status: true,
      todayCount: todayCount,
      lastSevenDaysCount: lastSevenDaysCount,
      ThisMonthCount: ThisMonthCount,
      lastMonthCount: lastMonthCount,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

app.get("/monthlywiseCount", monthlywiseCount);
async function monthlywiseCount(req, res) {
  try {
    if (req.query.id == "undefined") {
      return res.json({
        status: false,
        message: "id is undefined"
      });
    }
    let id = req.query.id;
    let query = {};
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    Employee_managemntTb = await db.collection(TBL_Employee_management);
    Store_managemntTb = await db.collection(TBL_Store_management);
    let employeeResponse = await Employee_managemntTb.findOne({
      _id: new ObjectId(id),
    });
    let storeManagementResponse = await Store_managemntTb.find(
      { store_employee: id },
      { projection: { store_name: 1 } }
    ).toArray();
    let isAdmin =
      employeeResponse?.access_control.includes("cashdiscountadmin");
    if (isAdmin) {
      query = {};
    } else {
      query.created_by = req.query.id;
    }
    let lastSevenDaysCount = await SaveDiscountTb.aggregate([
      {
        $addFields: {
          created_at_date: { $toDate: "$created_at" },
        },
      },
      {
        $match: query,
      },
      {
        $group: {
          _id: {
            year: { $year: "$created_at_date" },
            month: { $month: "$created_at_date" },
          },

          // totalcount: { $sum: 1 },
          Approved: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Approved"] },
                then: 1,
                else: 0,
              },
            },
          },
          Rejected: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Reject"] },
                then: 1,
                else: 0,
              },
            },
          },
          awaiting: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "awaiting"] },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $project: {
          // totalcount: 1,
          Approved: 1,
          Rejected: 1,
          awaiting: 1,
          month: {
            $arrayElemAt: [
              [
                "",
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
              "$_id.month",
            ],
          },
          _id: 0,
        },
      },
    ]).toArray();
    return res.json({
      status: true,
      data: lastSevenDaysCount,
    });
  } catch (error) {
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

module.exports = app;
