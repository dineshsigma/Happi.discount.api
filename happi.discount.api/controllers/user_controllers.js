let express = require("express");
const mongo = require("../../db.js");
let axios = require("axios");
let branch = require("../../apxmodules/apxapi");
let app = express();
const TBL_Discount_Users = "discount_employee_management";
const TBL_Discount_Designation = "discount_designation";
const TBL_Discount_Department = "discount_department";
const TBL_Discount_City = "discount_city";
const TBL_Discount_Location = "discount_locations";
let Discount_Location = null;
let DiscountUsersTb = null;
let Discount_City = null;
let Discount_Designation = null;
let Discount_Department = null;
//#### get list of users from Apx Apis
app.post("/discountUsers", discountUsers);
async function discountUsers(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    DiscountUsersTb = await db.collection(TBL_Discount_Users);
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: "http://183.82.44.213/api/apxapi/GetSalespersonMasterInfo?CompanyCode=HM",
      headers: {
        UserId: "WEBSITE",
        SecurityCode: "3489-7629-9163-3979",
      },
    };
    let response = await axios(config);
    Discount_Designation = await db.collection(TBL_Discount_Designation);
    Discount_Department = await db.collection(TBL_Discount_Department);
    Discount_Location = await db.collection(TBL_Discount_Location);
    for (let i = 0; i < response?.data?.Data?.length; i++) {
      let designation = await Discount_Designation.findOne({
        designation_name: response?.data?.Data[i]?.DESIGNATION,
      });
      let department = await Discount_Department.findOne({
        department_name: response?.data?.Data[i]?.DEPARTMENT,
      });
      let location = await Discount_Location.findOne({
        location_name: response?.data?.Data[i].BRANCH_NAME,
      });
      let userData = await DiscountUsersTb.findOne(
        { mobile: response?.data?.Data[i].SLPR_PHONE },
        { projection: { access_control: 1 } }
      );
      let userObj = {
        emp_id: response?.data?.Data[i]?.SLPR_CODE,
        name: response?.data?.Data[i]?.SLPR_NAME,
        email: response?.data?.Data[i]?.SLPR_EMAIL,
        department: department?._id.toString() || null,
        designation: designation?._id.toString() || null, //
        mobile: response?.data?.Data[i].SLPR_PHONE,
        branch_code: response?.data?.Data[i].BRANCH_CODE,
        branch_name: response?.data?.Data[i].BRANCH_NAME, //location
        category: response?.data?.Data[i].SLPR_CATEGORY,
        created_on: response?.data?.Data[i]?.CREATED_ON,
        aadhar_no: response?.data?.Data[i]?.AADHAR_NO,
        access_control: userData?.access_control || [],
        login_otp_required: true,
        status: response?.data?.Data[i]?.SLPR_STATUS,
        password:
          "$2b$10$lxP.wOVHOEGhNC50xAneYedg77vW0ozmNcktMAfdtGSmqhGPkdSua",
        createdDate: new Date(),
        region: "64bfb9b6335bfcbd33674336",
        work_location: location?._id.toString() || null,
      };
      await DiscountUsersTb.updateOne(
        { mobile: response?.data?.Data[i].SLPR_PHONE },
        {
          $set: {
            ...userObj,
            employee_sync_date: new Date(),
          },
        },
        { upsert: true }
      );
    }
    return res.json({
      status: true,
      message: "Employee details updated successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

// location isert data
app.post("/createlocation", location);
async function location(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    Discount_Location = await db.collection(TBL_Discount_Location);
    let branchDetails = await branch.getBranchInfoDetails();
    for (var i = 0; i < branchDetails.length; i++) {
      let data = {
        location_name: branchDetails[i]?.BRANCH_NAME,
        status: branchDetails[i]?.BRANCH_STATUS,
        created_at: new Date(),
      };
      await Discount_Location.insertOne(data);
      console.log(i);
    }
    return res.json({
      status: true,
      message: "Data inserted successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

app.post("/createcity", location);
async function location(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    Discount_City = await db.collection(TBL_Discount_City);
    let branchDetails = await branch.getBranchInfoDetails();
    for (var i = 0; i < branchDetails.length; i++) {
      let checkcity = await Discount_City.findOne({
        city: branchDetails[i]?.BRANCH_CITY,
      });
      if (checkcity == null) {
        let data = {
          city: branchDetails[i]?.BRANCH_CITY,
          status: branchDetails[i]?.BRANCH_STATUS,
          created_at: new Date(),
        };
        await Discount_City.insertOne(data);
        console.log(i);
      } else {
        console.log("allal", branchDetails[i]?.BRANCH_CITY);
      }
    }
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

app.post("/createdepartments", createdepartments);
async function createdepartments(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    Discount_Department = await db.collection(TBL_Discount_Department);
    let branchDetails = await branch.getEmployeeeDetails();
    for (var i = 0; i < branchDetails.length; i++) {
      let checkcity = await Discount_Department.findOne({
        department_name: branchDetails[i]?.DEPARTMENT,
      });
      if (checkcity == null) {
        let data = {
          department_name: branchDetails[i]?.DEPARTMENT,
          status: branchDetails[i]?.SLPR_STATUS,
          created_at: new Date(),
        };
        await Discount_Department.insertOne(data);
        console.log(i);
      } else {
        console.log("allal", branchDetails[i]?.DEPARTMENT);
      }
    }
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

app.post("/createdesignation", createdesignation);
async function createdesignation(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    Discount_Designation = await db.collection(TBL_Discount_Designation);
    let branchDetails = await branch.getEmployeeeDetails();
    for (var i = 0; i < branchDetails.length; i++) {
      let checkcity = await Discount_Designation.findOne({
        designation_name: branchDetails[i]?.DESIGNATION,
      });
      if (checkcity == null) {
        let data = {
          designation_name: branchDetails[i]?.DESIGNATION,
          status: branchDetails[i]?.SLPR_STATUS,
          created_at: new Date(),
        };
        await Discount_Designation.insertOne(data);
        console.log(i);
      } else {
        console.log("allal", branchDetails[i]?.DESIGNATION);
      }
    }
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "Error",
    });
  }
}

app.put("/updatedes", updatedes);
async function updatedes(req, res) {
  try {
    const db = await mongo.happi_discount_connect();
    DiscountUsersTb = await db.collection(TBL_Discount_Users);
    Discount_Designation = await db.collection(TBL_Discount_Designation);
    Discount_Department = await db.collection(TBL_Discount_Department);
    // Discount_Zone = await db.collection(TBL_Discount_Zone);
    let data = await DiscountUsersTb.find({}).toArray();
    for (var i = 0; i < data.length; i++) {
      let designation = await Discount_Designation.findOne({
        designation_name: data[i].designation,
      });
      let department = await Discount_Department.findOne({
        department_name: data[i].department,
      });
      //   console.log("designation", designation._id.toString());
      //   console.log("department", department._id.toString());
      await DiscountUsersTb.updateOne(
        { mobile: data[i].mobile },
        {
          $set: {
            department: department._id.toString(),
            designation: designation._id.toString(),
            region: "64bfb9b6335bfcbd33674336",
          },
        }
      );
    }
  } catch (error) {}
}
app.get("/test", test);
async function test(req, res) {
  const db = await mongo.happi_discount_connect();
  let coll = await db.collection("bkp_userCartDetails");
  let query = {};
  query.name = { $regex: req.query.name, $options: "si" };
  query.model = { $eq: req.query.model };
  query.brand = { $eq: req.query.brand };
  query.store = { $eq: req.query.store };
  let data = await coll.find(query).toArray();
  return res.json({
    status: true,
    data: data,
  });
}

module.exports = app;
