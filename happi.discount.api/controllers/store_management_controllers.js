let express = require("express");
const res = require("express/lib/response");
const { ObjectId } = require("mongodb");
const mongo = require("../../db.js");
let branch = require("../../apxmodules/apxapi.js");
let logsService = require("../../logservice.js");
let app = express();
const TBL_Store_management = "discount_store_management";
const TBL_Employee_management = "discount_employee_management";
const TBL_Discount_Location = "discount_locations";
const TBL_Discount_City = "discount_city";
const TBL_Discount_State = "discount_state";
const TBL_Discount_Country = "discount_country";
const TBL_Discount_Zone = "discount_zone";
let Store_managemntTb = null;
let Employee_managementTb = null;
let Discount_City = null;
let Discount_State = null;
let Discount_Country = null;
let Discount_Zone = null;
let Discount_Location = null;
//------------------------------get All  Store management Details ---------------------------//
app.get("/getStoreManagementList", getStoreManagementList);
async function getStoreManagementList(req, res) {
  try {
    let query = {};
    if (
      req.query.store_name != null &&
      req.query.store_name != undefined &&
      req.query.store_name != "" &&
      req.query.store_name != "null"
    ) {
      query.store_name = { $regex: req.query.store_name, $options: "si" };
    }
    const db = await mongo.happi_discount_connect();
    Store_managemntTb = await db.collection(TBL_Store_management);
    let store_management_response = await Store_managemntTb.aggregate([
      { $match: query },
      {
        $addFields: {
          regionObjectId: { $toObjectId: "$region" },
        },
      },
      {
        $addFields: {
          countryObjectId: {
            $toObjectId: "$country",
          },
        },
      },
      {
        $addFields: {
          stateObjectId: { $toObjectId: "$state" },
        },
      },
      {
        $addFields: {
          cityObjectId: { $toObjectId: "$city" },
        },
      },
      {
        $addFields: {
          locationObjectId: {
            $toObjectId: "$location",
          },
        },
      },
      {
        $addFields: {
          storeAsmObjectId: {
            $toObjectId: "$store_asm",
          },
        },
      },
      {
        $addFields: {
          salesHeadObjectId: {
            $toObjectId: "$sales_head",
          },
        },
      },
      {
        $addFields: {
          store_employee: {
            $map: {
              input: "$store_employee",
              in: { $toObjectId: "$$this" },
            },
          },
        },
      },
      {
        $addFields: {
          store_sales_head: {
            $map: {
              input: "$store_sales_head",
              in: { $toObjectId: "$$this" },
            },
          },
        },
      },
      {
        $lookup: {
          from: "discount_zone",
          localField: "regionObjectId",
          foreignField: "_id",
          as: "regionoutput",
        },
      },
      {
        $lookup: {
          from: "discount_country",
          localField: "countryObjectId",
          foreignField: "_id",
          as: "countryoutput",
        },
      },
      {
        $lookup: {
          from: "discount_state",
          localField: "stateObjectId",
          foreignField: "_id",
          as: "stateoutput",
        },
      },
      {
        $lookup: {
          from: "discount_city",
          localField: "cityObjectId",
          foreignField: "_id",
          as: "cityoutput",
        },
      },
      {
        $lookup: {
          from: "discount_locations",
          localField: "locationObjectId",
          foreignField: "_id",
          as: "locationoutput",
        },
      },
      {
        $lookup: {
          from: "discount_employee_management",
          localField: "storeAsmObjectId",
          foreignField: "_id",
          as: "storeasmoutput",
        },
      },
      {
        $lookup: {
          from: "discount_employee_management",
          localField: "salesHeadObjectId",
          foreignField: "_id",
          as: "salesheadoutput",
        },
      },
      {
        $lookup: {
          from: "discount_employee_management",
          localField: "store_employee",
          foreignField: "_id",
          as: "storeemployeeoutput",
        },
      },
      {
        $lookup: {
          from: "discount_employee_management",
          localField: "store_sales_head",
          foreignField: "_id",
          as: "storesaleheadoutput",
        },
      },
      {
        $addFields: {
          store_employee_names: {
            $map: {
              input: "$storeemployeeoutput",
              as: "employee",
              in: "$$employee.name", // Assuming the name field is named "name"
            },
          },
        },
      },
      {
        $addFields: {
          store_sales_employee_names: {
            $map: {
              input: "$storesaleheadoutput",
              as: "employee",
              in: "$$employee.name", // Assuming the name field is named "name"
            },
          },
        },
      },

      {
        $project: {
          regionoutput: 1,
          countryoutput: 1,
          stateoutput: 1,
          locationoutput: 1,
          storeasmoutput: 1,
          salesheadoutput: 1,
          store_employee_names: 1,
          store_sales_employee_names: 1,
          //storesaleheadoutput: 1,
          cityoutput: 1,
          store_code: 1,
          store_name: 1,
          email: 1,
          mobile: 1,
          address: 1,
          pincode: 1,
          latitude: 1,
          longitude: 1,
          status: 1,
        },
      },
    ])
      .sort({ _id: -1 })
      .toArray();
    return res.json({
      status: true,
      data: store_management_response,
    });
  } catch (error) {
    logsService.log("error", req, "STORE MANAGEMENT LIST", error + "");
    return res.json({
      status: false,
      data: error,
    });
  }
}

//-----------get ids based on Employee Names ---------------------------//

async function getEmployeeIds(arrayOfNames) {
  const db = await mongo.happi_discount_connect();
  Employee_managementTb = await db.collection(TBL_Employee_management);
  let employessNamesArray = await Employee_managementTb.aggregate([
    {
      $match: {
        name: {
          $in: arrayOfNames,
        },
      },
    },
    {
      $group: {
        _id: null,
        ids: { $push: "$_id" },
      },
    },
    {
      $project: {
        _id: 0,
        ids: { $map: { input: "$ids", as: "id", in: { $toString: "$$id" } } },
      },
    },
  ]).toArray();
  return employessNamesArray;
}

//---------------------------update single Store Management Details------------------------------//
app.put("/updateStoreManagement", updateStoreManagement);
async function updateStoreManagement(req, res) {
  let data = req.body;
  let id = req.body.id;
  // console.log("data", data);
  try {
    const db = await mongo.happi_discount_connect();
    Store_managemntTb = await db.collection(TBL_Store_management);
    Employee_managementTb = await db.collection(TBL_Employee_management);
    Discount_Location = await db.collection(TBL_Discount_Location);
    Discount_City = await db.collection(TBL_Discount_City);
    Discount_State = await db.collection(TBL_Discount_State);
    Discount_Country = await db.collection(TBL_Discount_Country);
    Discount_Zone = await db.collection(TBL_Discount_Zone);
    let region = await Discount_Zone.findOne({ region: data.region });
    let country = await Discount_Country.findOne({ country: data.country });
    let state = await Discount_State.findOne({ state_name: data.state });
    let city = await Discount_City.findOne({ city: data.city });
    let location = await Discount_Location.findOne({
      location_name: data.location,
    });
    let sales_head = await Employee_managementTb.findOne({
      name: data.sales_head,
    });
    let store_asm = await Employee_managementTb.findOne({
      name: data.store_asm,
    });
    let store_employee = await getEmployeeIds(data.store_employee);
    let store_sales_head = await getEmployeeIds(data.store_sales_head);
    data.location = location?._id.toString();
    data.region = region?._id.toString();
    data.city = city?._id.toString();
    data.country = country?._id.toString();
    data.store_asm = store_asm?._id.toString();
    data.sales_head = sales_head?._id.toString();
    data.state = state?._id.toString();
    // console.log(store_employee);
    data.store_employee = store_employee[0]?.ids;
    data.store_sales_head = store_sales_head[0]?.ids;

    data.updateDate = new Date();
    // console.log("data", data);
    delete data.id;
    data.store_name = data?.store_name?.replace(/\s/g, "");
    data.store_name = data?.store_name.toUpperCase();
    //### need to check the duplicate store name if already exits
    // console.log("data", data);
    let checkStoreName = await Store_managemntTb.findOne({
      store_name: data.store_name,
    });
    console.log(checkStoreName, "checkStoreName");
    // if (checkStoreName != null) {
    //   if (checkStoreName?._id?.toString() !== data.id) {
    //     return res.json({
    //       status: false,
    //       message: "Store Name Already Exits",
    //     });
    //   }
    // }
    // console.log("data", data);
    await Store_managemntTb.updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );
    return res.json({
      status: true,
      message: "Store Management Updated Successfully",
    });
  } catch (error) {
    logsService.log("error", req, "UPDATE STORE MANAGEMENT", error + "");
    return res.json({
      status: false,
      data: error,
    });
  }
}

//assign Employyeee
app.post("/createStoremanagement", createStoremanagement);
async function createStoremanagement(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    Employee_managementTb = await db.collection(TBL_Employee_management);
    Store_managemntTb = await db.collection(TBL_Store_management);
    Discount_Location = await db.collection(TBL_Discount_Location);
    Discount_City = await db.collection(TBL_Discount_City);
    Discount_State = await db.collection(TBL_Discount_State);
    let getBranchDetails = await branch.getBranchInfoDetails();
    let bulk_write_commands = [];
    for (var i = 0; i < getBranchDetails?.length; i++) {
      let store_employee = await Employee_managementTb.find(
        { status: "Active", branch_name: getBranchDetails[i].BRANCH_NAME },
        { projection: { _id: 1 } }
      ).toArray();

      let store_sales_head = await Employee_managementTb.find(
        {
          status: "Active",
          branch_name: getBranchDetails[i].BRANCH_NAME,
          category: "Store Head",
        },
        { projection: { _id: 1 } }
      ).toArray();
      //############### GET STORE EMPLOYEE IDS FROM APX #####################
      store_employee = store_employee.map((item, index) => {
        return item._id.toString();
      });
      //############### GET STORE SALES HEAD IDS FROM APX #####################
      store_sales_head = store_sales_head.map((item, index) => {
        return item._id.toString();
      });
      // ################# GET PREVIOUES DATA FROM STORE MANAGEMENT DATA ################

      let store_data = await Store_managemntTb.find(
        {
          store_code: getBranchDetails[i].BRANCH_CODE,
        },
        { projection: { _id: 0, store_employee: 1, store_sales_head: 1 } }
      ).toArray();
    

      let database_store_employee = store_data[0]?.store_employee;
      if(database_store_employee !=null && store_employee?.length > 0 ){
        let get_all_store_employee = store_employee.filter(
          (value) => !database_store_employee?.includes(value)
        );
        database_store_employee = [
          ...get_all_store_employee,
          ...database_store_employee,
        ];
      }
      //################ FOR GETTING OLD DATA IN DATABASE ####################
      let database_store_sales_head = store_data[0]?.store_sales_head;
      if (database_store_sales_head != null && store_sales_head.length > 0) {
        let get_all_store_sales_head = store_sales_head.filter(
          (value) => !database_store_sales_head?.includes(value)
        );
        database_store_sales_head = [
          ...get_all_store_sales_head,
          ...database_store_sales_head,
        ];
      }
      let location = await Discount_Location.findOne({
        location_name: getBranchDetails[i].BRANCH_NAME,
      });
      let city = await Discount_City.findOne({
        city: getBranchDetails[i]?.BRANCH_CITY,
      });
      let state = await Discount_State.findOne({
        state_name: getBranchDetails[i]?.BRANCH_STATE,
      });
      let storeObj = {
        store_code: getBranchDetails[i]?.BRANCH_CODE?.toUpperCase(),
        store_name: getBranchDetails[i].BRANCH_NAME?.toUpperCase(),
        email: getBranchDetails[i]?.BRANCH_EMAIL,
        mobile: getBranchDetails[i]?.BRANCH_PHONE,
        address: `${getBranchDetails[i]?.BRANCH_ADDLINE1},${getBranchDetails[i]?.BRANCH_ADDLINE2}`,
        store_employee: database_store_employee,
        store_sales_head: database_store_sales_head,
        city: city?._id.toString() || null, //
        state: state?._id.toString() || null, //
        country: "64bfce5e2c0838860dbfcf8b",
        region: "64bfb9b6335bfcbd33674336",
        location: location?._id.toString() || null,
        pincode: getBranchDetails[i]?.BRANCH_PINCODE,
        store_open_on: getBranchDetails[i]?.BRANCH_OPENEDON,
        status: getBranchDetails[i]?.BRANCH_STATUS,
        createdDate: new Date(),
        updateDate: new Date(),
        enable: true,
      };
      bulk_write_commands.push({
        updateOne: {
          filter: {
            store_code: getBranchDetails[i]?.BRANCH_CODE?.toUpperCase(),
          },
          update: {
            $set: {
              ...storeObj,
              store_management_sync_date: new Date(),
            },
          },
          upsert: true,
        },
      });
    }
    await Store_managemntTb.bulkWrite(bulk_write_commands);
    return res.json({
      status: true,
      message: "Success",
    });
  } catch (error) {
    logsService.log("error", req, "CREATE STORE MANAGEMENT", error + "");
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

module.exports = app;
