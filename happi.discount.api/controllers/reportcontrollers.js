let express = require("express");
const mongo = require("../../db.js");
let jsonParser = require("../../modules/jsonparser");
let logsService = require("../../logservice.js");
let app = express();
const TBL_Save_Discount = "save_discount";
const TBL_Store_management = "discount_store_management";
let SaveDiscountTb = null;
let Store_managemntTb = null;

async function adminDashBoardQuery(query) {
  try {
    let adminDashBoardReport = await SaveDiscountTb.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: {
            store_name: "$store_name",
            created_at: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: { $toDate: "$created_at" },
              },
            },
          },
          raisedcount: { $sum: 1 },
          total_amount: { $sum: "$discount_price" },
          pending: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "awaiting"] },
                then: 1,
                else: 0,
              },
            },
          },
          Approved: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Approved"] },
                then: 1,
                else: 0,
              },
            },
          },
          used: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "used"] },
                then: 1,
                else: 0,
              },
            },
          },
          not_used: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "not_used"] },
                then: 1,
                else: 0,
              },
            },
          },
          not_used_discount: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "not_used"] },
                then: "$discount_price",
                else: 0,
              },
            },
          },
          used_discount: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "used"] },
                then: "$discount_price",
                else: 0,
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          store_name: "$_id.store_name",
          created_at: "$_id.created_at",
          raisedcount: 1,
          pending: 1,
          Approved: 1,
          approved_count: {
            $sum: {
              $add: ["$used", "$not_used"],
            },
          },
          total_amount: 1,
          used: 1,
          not_used: 1,
          used_discount: 1,
          not_used_discount: 1,
        },
      },
    ]).toArray();

    return adminDashBoardReport;
  } catch (error) {
    return "error";
  }
}

app.get("/adminDashboardReport", adminDashboardReportView);
async function adminDashboardReportView(req, res) {
  try {
    let data = req.query;
    let query = {};
    if (data.fromdate == "" || data.todate == "" || data.filter_by == "null") {
      return res.json({
        status: false,
        message: "Please enter from date and to date",
      });
    } else if (data.filter_by == "all") {
    } else if (data.filter_by == "store") {
      if (data.store_id == "null") {
        return res.json({
          status: false,
          message: "Please Select the Store Name",
        });
      }
      // query.store_id = data.store_id;
    }
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);

    let fromdate = new Date(data.fromdate);
    let todate = new Date(data.todate);
    todate.setDate(todate.getDate() + 1);
    fromdate.setHours(0, 0, 0, 0);
    todate.setHours(0, 0, 0, 0);
    query.created_at = {
      $gte: fromdate.toISOString(),
      $lte: todate.toISOString(),
    };
    let adminDashBoardRes = await adminDashBoardQuery(query);
    return res.json({
      status: true,
      data: adminDashBoardRes,
    });
  } catch (error) {
    logsService.log("error", req, "ADMIN DASH BORAD REPORT", error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}
//########### ADMIN DASHBARD REPORT DOWNLOAD API #####################//
app.get("/adminDashboardReportDownload", adminDashboardReportDownload);
async function adminDashboardReportDownload(req, res) {
  try {
    let data = req.query;
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    let query = {};
    let fromdate = new Date(data.fromdate);
    let todate = new Date(data.todate);
    todate.setDate(todate.getDate() + 1);
    fromdate.setHours(0, 0, 0, 0);
    todate.setHours(0, 0, 0, 0);
    query.created_at = {
      $gte: fromdate.toISOString(),
      $lte: todate.toISOString(),
    };
    if (req.query.filter_by == "store") {
      query.store_id = data.store_id;
    }
    let adminDashBoardRes = await SaveDiscountTb.find(query).toArray();
    if (adminDashBoardRes.length > 0) {
      await jsonParser.DownloadCSV(adminDashBoardRes, res);
    } else {
      return res.json({
        status: false,
        message: "NO DATA FOUND",
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      message: "Error",
    });
  }
}
//#################### MANAGER REPORT VIEW ############################
app.get("/managerReportView", managerReportView);
async function managerReportView(req, res) {
  try {
    let data = req.query;
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    Store_managemntTb = await db.collection(TBL_Store_management);
    let query = {};
    let fromdate = new Date(data.fromdate);
    let todate = new Date(data.todate);
    todate.setDate(todate.getDate() + 1);
    fromdate.setHours(0, 0, 0, 0);
    todate.setHours(0, 0, 0, 0);
    query.created_at = {
      $gte: fromdate.toISOString(),
      $lte: todate.toISOString(),
    };
    let managerDashBoardRes;
    if (req.query.store_name != "all") {
      query.store_name = req.query.store_name;
      managerDashBoardRes = await adminDashBoardQuery(query);
    } else {
      let storeList = await Store_managemntTb.find(
        { store_employee: data.id },
        { projection: { store_name: 1 } }
      ).toArray();
      storeList = storeList.map((item, index) => {
        return item.store_name;
      });
      query.store_name = { $in: storeList };
      managerDashBoardRes = await adminDashBoardQuery(query);
    }
    return res.json({
      status: true,
      data: managerDashBoardRes,
    });
  } catch (error) {
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

module.exports = app;
