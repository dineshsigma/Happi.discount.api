let express = require("express");
const mongo = require("../../db.js");
let logsService = require("../../logservice.js");
let jsonParser = require("../../modules/jsonparser");
let app = express();
const TBL_Save_Discount = "save_discount";
let SaveDiscountTb = null;
//###################### IN ADMIN THERE IS A REPORT ICON IN THAT ICON THERE I WILL BE A MANAGER
//###################### REPORT .IN THAT REPORT  FILTER WITH STORE NAME , BRAND,Model  WISE REPORTS #############
app.get("/adminManagerReports", adminManagerReports);
async function adminManagerReports(req, res) {
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
    if (data.filter_by == "store") {
      query.store_name = data.store_name;
    } else if (data.filter_by == "brand") {
      query.brand = data.brand;
    } else if (data.filter_by == "Approver") {
      query.cash_approver_name = data.cash_approver_name;
    }
    if (data.report == "view") {
      let managerReportsView = await SaveDiscountTb.find(query).toArray();
      return res.json({
        status: true,
        data: managerReportsView,
      });
    } else {
      let managerReportsView = await SaveDiscountTb.find(query).toArray();
      if (managerReportsView.length > 0) {
        await jsonParser.DownloadCSV(managerReportsView, res);
      } else {
        return res.json({
          status: false,
          message: "NO DATA FOUND",
        });
      }
    }
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//HEIRARCHY FOR REPOSRTS THIS FUNCTION GET STORE WISE REPORT
//WHICH HAS STATUS IS APPROVED COUNT AND HANDSET PRICE
app.get("/storeReports", storeReports);
async function storeReports(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    let storesReportResponse = await SaveDiscountTb.aggregate([
      {
        $group: {
          _id: "$store_name",
          total_count: { $sum: 1 },
          Approved: {
            $sum: {
              $cond: {
                if: {
                  $and: [{ $eq: ["$status", "Approved"] }],
                },
                then: 1,
                else: 0,
              },
            },
          },
          total_price: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Approved"] },
                then: "$total_price",
                else: 0,
              },
            },
          },
          discount_price: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Approved"] },
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
          store_name: "$_id",
          total_count: 1,
          total_price: 1,
          discount_price: 1,
          Approved: 1,
          discount_percentage: {
            $cond: {
              if: { $eq: ["$total_price", 0] },
              then: 0,
              else: {
                $multiply: [
                  {
                    $divide: ["$discount_price", "$total_price"],
                  },
                  100,
                ],
              },
            },
          },
        },
      },
    ]).toArray();
    return res.json({
      status: true,
      data: storesReportResponse,
    });
  } catch (error) {
    console.log("Error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

app.get("/brandReports", brandReports);
async function brandReports(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    let brandReportResponse = await SaveDiscountTb.aggregate([
      {
        $match: {
          store_name: { $eq: req.query.store_name },
          status: { $eq: "Approved" },
        },
      },
      {
        $group: {
          _id: "$brand",
          total_count: { $sum: 1 },
          Approved: {
            $sum: {
              $cond: {
                if: {
                  $and: [{ $eq: ["$status", "Approved"] }],
                },
                then: 1,
                else: 0,
              },
            },
          },
          total_price: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Approved"] },
                then: "$total_price",
                else: 0,
              },
            },
          },
          discount_price: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Approved"] },
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
          brand: "$_id",
          total_count: 1,
          total_price: 1,
          discount_price: 1,
          Approved: 1,
          discount_percentage: {
            $cond: {
              if: { $eq: ["$total_price", 0] },
              then: 0,
              else: {
                $multiply: [
                  {
                    $divide: ["$discount_price", "$total_price"],
                  },
                  100,
                ],
              },
            },
          },
        },
      },
    ]).toArray();
    return res.json({
      status: true,
      data: brandReportResponse,
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "ERRRO",
    });
  }
}

app.get("/modelReport", modelReport);
async function modelReport(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    let modelReportResponse = await SaveDiscountTb.aggregate([
      {
        $match: {
          store_name: { $eq: req.query.store_name },
          brand: { $eq: req.query.brand },
          status: { $eq: "Approved" },
        },
      },
      {
        $group: {
          _id: "$model",
          total_count: { $sum: 1 },
          Approved: {
            $sum: {
              $cond: {
                if: {
                  $and: [{ $eq: ["$status", "Approved"] }],
                },
                then: 1,
                else: 0,
              },
            },
          },
          total_price: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Approved"] },
                then: "$total_price",
                else: 0,
              },
            },
          },
          discount_price: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Approved"] },
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
          model: "$_id",
          total_count: 1,
          total_price: 1,
          discount_price: 1,
          Approved: 1,
          discount_percentage: {
            $cond: {
              if: { $eq: ["$total_price", 0] },
              then: 0,
              else: {
                $multiply: [
                  {
                    $divide: ["$discount_price", "$total_price"],
                  },
                  100,
                ],
              },
            },
          },
        },
      },
    ]).toArray();
    return res.json({
      status: true,
      data: modelReportResponse,
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

async function reportHeirarchyAggregationQuery(query) {
  try {
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    let reportHeirarchyResponse = await SaveDiscountTb.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            store_name: "$store_name",
            brand: "$brand",
            model: "$model",
          },
          total_price: { $sum: "$total_price" },
          discount_price: { $sum: "$discount_price" },
          total_count: { $sum: 1 },
          ApprovedCount: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "used"] },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
      {
        $group: {
          _id: {
            store_name: "$_id.store_name",
            brand: "$_id.brand",
          },
          total_price: { $sum: "$total_price" },
          discount_price: { $sum: "$discount_price" },
          total_count: { $sum: 1 },
          models: {
            $push: {
              model: "$_id.model",
              total_price: "$total_price",
              discount_price: "$discount_price",
              total_count: { $sum: 1 },
              discount_percentage: {
                $cond: {
                  if: { $eq: ["$total_price", 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      {
                        $divide: ["$discount_price", "$total_price"],
                      },
                      100,
                    ],
                  },
                },
              },
              ApprovedCount: { $sum: "$ApprovedCount" },
            },
          },
          ApprovedCount: { $sum: "$ApprovedCount" },
        },
      },
      {
        $group: {
          _id: "$_id.store_name",
          total_price: { $sum: "$total_price" },
          discount_price: { $sum: "$discount_price" },
          total_count: { $sum: 1 },
          brands: {
            $push: {
              brand: "$_id.brand",
              total_price: "$total_price",
              discount_price: "$discount_price",
              total_count: { $sum: 1 },
              discount_percentage: {
                $cond: {
                  if: { $eq: ["$total_price", 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      {
                        $divide: ["$discount_price", "$total_price"],
                      },
                      100,
                    ],
                  },
                },
              },
              model: "$models",
              ApprovedCount: { $sum: "$ApprovedCount" },
            },
          },
          ApprovedCount: { $sum: "$ApprovedCount" },
        },
      },
      {
        $project: {
          _id: 0,
          store_name: "$_id",
          discount_price: 1,
          total_price: 1,
          brands: 1,
          total_count: 1,
          ApprovedCount: 1,
          discount_percentage: {
            $cond: {
              if: { $eq: ["$total_price", 0] },
              then: 0,
              else: {
                $multiply: [
                  {
                    $divide: ["$discount_price", "$total_price"],
                  },
                  100,
                ],
              },
            },
          },
        },
      },
    ]).toArray();
    return reportHeirarchyResponse;
  } catch (error) {
    return "ERROR";
  }
}

async function brandWiseReportHeirarchyAggregationQuery(query) {
  try {
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    let brandwisereportHeirarchyResponse = await SaveDiscountTb.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            brand: "$brand",
            model: "$model",
            reference_no: "$reference_no",
          },
          total_price: { $sum: "$total_price" },
          discount_price: { $sum: "$discount_price" },
          total_count: { $sum: 1 },
          ApprovedCount: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "used"] },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },

      {
        $group: {
          _id: {
            store_name: "$_id.store_name",
            brand: "$_id.brand",
            model: "$_id.model",
            reference_no: "$reference_no",
          },
          total_price: { $sum: "$total_price" },
          discount_price: { $sum: "$discount_price" },
          total_count: { $sum: 1 },
          modelsArray: {
            $push: {
              reference_no: "$_id.reference_no",
              total_price: "$total_price",
              discount_price: "$discount_price",
              total_count: { $sum: 1 },
              discount_percentage: {
                $cond: {
                  if: { $eq: ["$total_price", 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      {
                        $divide: ["$discount_price", "$total_price"],
                      },
                      100,
                    ],
                  },
                },
              },
              ApprovedCount: {
                $sum: "$ApprovedCount",
              },
            },
          },
          ApprovedCount: { $sum: "$ApprovedCount" },
        },
      },
      {
        $group: {
          _id: "$_id.brand",
          total_price: { $sum: "$total_price" },
          discount_price: { $sum: "$discount_price" },
          total_count: { $sum: 1 },
          models: {
            $push: {
              model: "$_id.model",
              total_price: "$total_price",
              discount_price: "$discount_price",
              total_count: { $sum: 1 },
              discount_percentage: {
                $cond: {
                  if: { $eq: ["$total_price", 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      {
                        $divide: ["$discount_price", "$total_price"],
                      },
                      100,
                    ],
                  },
                },
              },
              ApprovedCount: { $sum: "$ApprovedCount" },
              modelArray: "$modelsArray",
            },
          },
          ApprovedCount: { $sum: "$ApprovedCount" },
        },
      },
      {
        $project: {
          _id: 0,
          brand: "$_id",
          discount_price: 1,
          total_price: 1,
          models: 1,
          total_count: 1,
          ApprovedCount: 1,
          discount_percentage: {
            $cond: {
              if: { $eq: ["$total_price", 0] },
              then: 0,
              else: {
                $multiply: [
                  {
                    $divide: ["$discount_price", "$total_price"],
                  },
                  100,
                ],
              },
            },
          },
        },
      },
    ]).toArray();
    return brandwisereportHeirarchyResponse;
  } catch (error) {
    return "ERROR";
  }
}

//###########################Report Heirarchy #######################
app.get("/reportHeirarchy", reportHeirarchy);
async function reportHeirarchy(req, res) {
  try {
    let query = { status: "used" };
    let reportsHeirarcyResponse = await reportHeirarchyAggregationQuery(query);
    return res.json({
      status: true,
      data: reportsHeirarcyResponse,
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

async function storeReportsWithReference(query) {
  try {
    const db = await mongo.happi_discount_connect();
    SaveDiscountTb = await db.collection(TBL_Save_Discount);
    let storereportsData = await SaveDiscountTb.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            store_name: "$store_name",
            brand: "$brand",
            model: "$model",
            reference_no: "$reference_no",
          },
          total_price: { $sum: "$total_price" },
          discount_price: { $sum: "$discount_price" },
          total_count: { $sum: 1 },
          ApprovedCount: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "used"] },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
      {
        $group: {
          _id: {
            store_name: "$_id.store_name",
            brand: "$_id.brand",
            model: "$_id.model",
            reference_no: "$reference_no",
          },
          total_price: { $sum: "$total_price" },
          discount_price: { $sum: "$discount_price" },
          total_count: { $sum: 1 },
          modelsArray: {
            $push: {
              reference_no: "$_id.reference_no",
              total_price: "$total_price",
              discount_price: "$discount_price",
              total_count: { $sum: 1 },
              discount_percentage: {
                $cond: {
                  if: { $eq: ["$total_price", 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      {
                        $divide: ["$discount_price", "$total_price"],
                      },
                      100,
                    ],
                  },
                },
              },
              ApprovedCount: {
                $sum: "$ApprovedCount",
              },
            },
          },
          ApprovedCount: { $sum: "$ApprovedCount" },
        },
      },

      {
        $group: {
          _id: {
            store_name: "$_id.store_name",
            brand: "$_id.brand",
            model: "$_id.model",
            reference_no: "$_id.reference_no",
          },
          total_price: { $sum: "$total_price" },
          discount_price: { $sum: "$discount_price" },
          total_count: { $sum: 1 },
          models: {
            $push: {
              model: "$_id.model",
              total_price: "$total_price",
              discount_price: "$discount_price",
              total_count: { $sum: 1 },
              discount_percentage: {
                $cond: {
                  if: { $eq: ["$total_price", 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      {
                        $divide: ["$discount_price", "$total_price"],
                      },
                      100,
                    ],
                  },
                },
              },
              ApprovedCount: {
                $sum: "$ApprovedCount",
              },
              modelArray: "$modelsArray",
            },
          },
          ApprovedCount: { $sum: "$ApprovedCount" },
        },
      },

      {
        $group: {
          _id: "$_id.store_name",
          total_price: { $sum: "$total_price" },
          discount_price: { $sum: "$discount_price" },
          total_count: { $sum: 1 },
          brands: {
            $push: {
              brand: "$_id.brand",
              total_price: "$total_price",
              discount_price: "$discount_price",
              total_count: { $sum: 1 },
              discount_percentage: {
                $cond: {
                  if: { $eq: ["$total_price", 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      {
                        $divide: ["$discount_price", "$total_price"],
                      },
                      100,
                    ],
                  },
                },
              },
              model: "$models",
              ApprovedCount: {
                $sum: "$ApprovedCount",
              },
            },
          },
          ApprovedCount: { $sum: "$ApprovedCount" },
        },
      },

      {
        $project: {
          _id: 0,
          store_name: "$_id",
          discount_price: 1,
          total_price: 1,
          brands: 1,
          total_count: 1,
          ApprovedCount: 1,
          discount_percentage: {
            $cond: {
              if: { $eq: ["$total_price", 0] },
              then: 0,
              else: {
                $multiply: [
                  {
                    $divide: ["$discount_price", "$total_price"],
                  },
                  100,
                ],
              },
            },
          },
        },
      },
    ]).toArray();
    return storereportsData;
  } catch (error) {
    return "error";
  }
}

//################## report heirarchy with mobile reports #########################
app.get("/reportHeirarchywithFilters", reportHeirarchywithFilters);
async function reportHeirarchywithFilters(req, res) {
  try {
    let query = {};
    let fromdate = new Date(req.query.fromdate);
    let todate = new Date(req.query.todate);
    todate.setDate(todate.getDate() + 1);
    fromdate.setHours(0, 0, 0, 0);
    todate.setHours(0, 0, 0, 0);
    query.created_at = {
      $gte: fromdate.toISOString(),
      $lte: todate.toISOString(),
    };
    query.status = "used";
    let filterwisereportHeirarchy;
    if (req.query.filter_by == "store") {
      filterwisereportHeirarchy = await storeReportsWithReference(query);
    }
    if (req.query.filter_by == "brand") {
      filterwisereportHeirarchy = await brandWiseReportHeirarchyAggregationQuery(query);
    }
    return res.json({
      status: true,
      data: filterwisereportHeirarchy,
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

module.exports = app;
