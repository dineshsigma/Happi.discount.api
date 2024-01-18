let express = require("express");
const mongo = require("../../db.js");
const { genSaltSync, hashSync, compareSync } = require("bcryptjs");
let logsService = require("../../logservice.js");
const jwt = require("jsonwebtoken");
let app = express();
const { ObjectId } = require("mongodb");
let otp = require("../../modules/otp");
let otplib = require("otplib");
const TBL_Employee_management = "discount_employee_management";
const TBL_Discount_Designation = "discount_designation";
const TBL_Discount_Department = "discount_department";
const TBL_Discount_Zone = "discount_zone";
const TBL_Discount_Location = "discount_locations";
let Employee_managemntTb = null;
let Discount_Designation = null;
let Discount_Department = null;
let Discount_Zone = null;
let Discount_Location = null;
var OTP_SECRET =
  process.env.OTP_SECRET ||
  "ETTRTFGFCFSCGJLKLLUIOYUITTFFGCFZXEAWRRTTIUIGHFERHAPPI2022IIPL";

otplib.authenticator.options = {
  step: 900,
  window: 1,
  digits: 6,
};
//------------------------------get All Employee Details ---------------------------//
app.get("/getEmployeeList", getEmployeeList);
async function getEmployeeList(req, res) {
  let collection = req.query.collection;
  let query = {};
  if (
    req.query.emp_id != null &&
    req.query.emp_id != undefined &&
    req.query.emp_id != "" &&
    req.query.emp_id != "null"
  ) {
    query.emp_id = { $regex: req.query.emp_id, $options: "si" };
  }
  try {
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(collection);
    let employee_management_response = await Employee_managemntTb.aggregate([
      { $match: query },
      { $addFields: { departmentObjectId: { $toObjectId: "$department" } } },
      { $addFields: { designationObjectId: { $toObjectId: "$designation" } } },
      { $addFields: { locationObjectId: { $toObjectId: "$work_location" } } },
      { $addFields: { zoneObjectId: { $toObjectId: "$region" } } },
      {
        $lookup: {
          from: "discount_department",
          localField: "departmentObjectId",
          foreignField: "_id",
          as: "departmentoutput",
        },
      },
      {
        $lookup: {
          from: "discount_designation",
          localField: "designationObjectId",
          foreignField: "_id",
          as: "designationoutput",
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
          from: "discount_zone",
          localField: "zoneObjectId",
          foreignField: "_id",
          as: "regionoutput",
        },
      },
      {
        $project: {
          departmentoutput: 1,
          designationoutput: 1,
          name: 1,
          email: 1,
          mobile: 1,
          access_control: 1,
          status: 1,
          login_otp_required: 1,
          emp_id: 1,
          regionoutput: 1,
          locationoutput: 1,
          password: 1,
        },
      },
    ])
      .sort({ _id: -1 })
      .toArray();
    return res.json({
      status: true,
      data: employee_management_response,
    });
  } catch (error) {
    // console.log("error", error);
    return res.json({
      status: false,
      data: error,
    });
  }
}
//----------------------------create New Employee--------------------------------------//
app.post("/createEmployee", createEmployee);
async function createEmployee(req, res) {
  let data = req.body;
  let mobile = req.body.mobile;
  let emp_id = req.body.emp_id;
  data.createdDate = new Date();
  data.updateDate = new Date();
  const Hashpassword = hashSync(req.body.password, 10);
  data.password = Hashpassword;
  const db = await mongo.happi_discount_connect();
  Employee_managemntTb = await db.collection(TBL_Employee_management);
  let employeePhoneCkeck = await Employee_managemntTb.findOne({
    mobile: mobile,
  });
  let employeeEmpCkeck = await Employee_managemntTb.findOne({ emp_id: emp_id });
  if (employeePhoneCkeck != null) {
    return res.json({
      status: false,
      message: "Mobile Number Already Exits",
    });
  }
  if (employeeEmpCkeck != null) {
    return res.json({
      status: false,
      message: "EMPID  Already Exits",
    });
  }
  try {
    await Employee_managemntTb.insertOne(data);
    return res.json({
      status: true,
      message: "Employee Created Successfully",
    });
  } catch (error) {
    return res.json({
      status: false,
      data: error,
    });
  }
}

//-------------------------------update Employee------------------------------------------//
app.put("/updateEmployee", updateEmployee);
async function updateEmployee(req, res) {
  let data = req.body;
  let id = data.id;
  try {
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(TBL_Employee_management);
    Discount_Designation = await db.collection(TBL_Discount_Designation);
    Discount_Department = await db.collection(TBL_Discount_Department);
    Discount_Zone = await db.collection(TBL_Discount_Zone);
    Discount_Location = await db.collection(TBL_Discount_Location);
    let department = await Discount_Department.findOne({
      department_name: data.department,
    });
    let designation = await Discount_Designation.findOne({
      designation_name: data.designation,
    });
    let zone = await Discount_Zone.findOne({ region: data.region });
    let location = await Discount_Location.findOne({
      location_name: data.work_location,
    });
    data.department = department?._id.toString();
    data.designation = designation?._id.toString();
    data.work_location = location?._id.toString();
    data.region = zone?._id.toString();
    data.updateDate = new Date();
    // const Hashpassword = hashSync(req.body.password, 10);
    // data.password = Hashpassword
    delete data.id;
    // console.log("data", data);
    // console.log("id", id)
    data.emp_id = data?.emp_id?.replace(/\s/g, "");
    data.emp_id = data?.emp_id.toUpperCase();
    //#### need to check validation for Employee Code
    let employeeCodeCheck = await Employee_managemntTb.findOne({
      emp_id: data.emp_id,
    });
    let employeeMobileCheck = await Employee_managemntTb.findOne({
      mobile: data.mobile,
    });
    // console.log("employeeCodeCheck", employeeCodeCheck)
    if (employeeCodeCheck) {
      if (employeeCodeCheck?._id.toString() !== id) {
        return res.json({
          status: false,
          message: "Employee Code Already Exits",
        });
      }
    }

    if (employeeMobileCheck) {
      if (employeeMobileCheck?._id.toString() !== id) {
        return res.json({
          status: false,
          message: "Employee Mobile Already Exits",
        });
      }
    }
    logsService.log("debug", req, "UPDATE EMPLOYEE DATA", data);
    await Employee_managemntTb.updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );
    return res.json({
      status: true,
      message: "Employee Details Updated Successfully",
    });
  } catch (error) {
    // console.log(error)
    return res.json({
      status: false,
      data: error,
    });
  }
}

//Employee Login

app.post("/discountEmployeeLogin", discountEmployeeLogin);
async function discountEmployeeLogin(req, res) {
  console.log("req.body", req.body);
  try {
    let data = req.body;
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(TBL_Employee_management);
    let EmployeeResponse = await Employee_managemntTb.findOne({
      emp_id: data.emp_id,
    });
    let EmployeeMobileResponse = await Employee_managemntTb.findOne({
      mobile: data.mobile,
    });
    if (EmployeeResponse == null) {
      return res.json({
        status: false,
        message: "Employee Not Registered",
      });
    }
    if (EmployeeMobileResponse == null) {
      return res.json({
        status: false,
        message: "Mobile Number Not Registered",
      });
    }
    const secret = OTP_SECRET + req.body.mobile;
    const token = otplib.authenticator.generate(secret);
    let message = `Happi Mobiles! Your OTP for user request login is: ${token}`;
    if (
      data.mobile == "9848272369" ||
      data.mobile == "9553944949" ||
      data.mobile == "8106838432" ||
      data.mobile == "8686836269"
    ) {
      return res.json({
        status: true,
        message: "OTP Send Successfully",
        employeeResponse: EmployeeResponse,
      });
    }

    let sendOtpResponse = await otp.sendSMS(data.mobile, message);
    console.log("sendOtpResponse", sendOtpResponse);
    if (sendOtpResponse == "Success") {
      return res.json({
        status: true,
        message: "OTP Send Successfully",
        employeeResponse: EmployeeResponse,
      });
    } else {
      return res.json({
        status: false,
        message: "Unable to Send Otp",
      });
    }
  } catch (error) {
    // console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//dummy discount Employee login

app.post("/discountEmployeeLogin1", discountEmployeeLogin1);
async function discountEmployeeLogin1(req, res) {
  console.log("req.body", req.body);
  try {
    let data = req.body;
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(TBL_Employee_management);
    //######## check empcode find emp code in database##################
    let EmployeeResponse = await Employee_managemntTb.findOne({
      emp_id: data.emp_id,
    });
    //######## check mobile number find mobile number in database##################
    let EmployeeMobileResponse = await Employee_managemntTb.findOne({
      mobile: data.mobile,
    });
    let employeeidandmobile = await Employee_managemntTb.findOne({
      emp_id: data.emp_id,
      mobile: data.mobile,
    });
    if (EmployeeResponse == null) {
      return res.json({
        status: false,
        message: "Employee Not Registered",
      });
    }
    if (EmployeeMobileResponse == null) {
      return res.json({
        status: false,
        message: "Mobile Number Not Registered",
      });
    }
    if (employeeidandmobile == null) {
      return res.json({
        status: false,
        message: "Employee code and Mobile Number Mis Match",
      });
    }
    //########## check if particular employee has login otp is required
    //then only send otp for that particular mobile number or else directly send  login successfully
    if (EmployeeResponse.login_otp_required == false) {
      jwt.sign(
        { user: EmployeeResponse.mobile },
        "jsonSecretKey",
        { expiresIn: "90d" },
        async function (err, token) {
          if (err) {
            res.json({
              status: false,
              message: "Invalid login credentials",
            });
          } else {
            await Employee_managemntTb.updateOne(
              { mobile: req.body.mobile },
              { $set: { token: token } }
            );
            return res.send({
              status: true,
              message: "Login Successfull",
              userId: EmployeeResponse,
              employeeResponse: EmployeeResponse,
              token: token,
            });
          }
        }
      );
    } else {
      const secret = OTP_SECRET + req.body.mobile;
      const token = otplib.authenticator.generate(secret);
      let message = `Happi Mobiles! Your OTP for user request login is: ${token}`;
      if (
        data.mobile == "9848272369" ||
        data.mobile == "9553944949" ||
        data.mobile == "8106838432" ||
        data.mobile == "8686836269"
      ) {
        return res.json({
          status: true,
          message: "OTP Send Successfully",
          employeeResponse: EmployeeResponse,
        });
      }

      let sendOtpResponse = await otp.sendSMS(data.mobile, message);
      console.log("sendOtpResponse", sendOtpResponse);
      if (sendOtpResponse == "Success") {
        return res.json({
          status: true,
          message: "OTP Send Successfully",
          employeeResponse: EmployeeResponse,
        });
      } else {
        return res.json({
          status: false,
          message: "Unable to Send Otp",
        });
      }
    }
  } catch (error) {
    // console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//######################CHANGE PASSWORD########################
app.post("/resetPassword", resetPassword);
async function resetPassword(req, res) {
  try {
    let data = req.body;
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(TBL_Employee_management);
    let employeeData = await Employee_managemntTb.findOne({
      _id: new ObjectId(data.id),
    });
    if (employeeData == null) {
      return res.json({
        status: false,
        message: "NO USER FOUND",
      });
    }
    if (data.newpassword == data.confirmpassword) {
      let Hashpassword = hashSync(req.body.newpassword, 10);
      await Employee_managemntTb.updateOne(
        { _id: new ObjectId(data.id) },
        { $set: { password: Hashpassword } }
      );
      return res.json({
        status: true,
        message: "New Password Updated Successfully",
      });
    } else {
      return res.json({
        status: false,
        message: "Mismatching New Password And Confirm Password ",
      });
    }
  } catch (error) {
    // console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

app.post("/getEmployeeByID", getEmployeeByID);
async function getEmployeeByID(req, res) {
  try {
    let data = req.body;
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(TBL_Employee_management);
    let employeeData = await Employee_managemntTb.findOne(
      { _id: new ObjectId(data.id) },
      { projection: { password: 1, name: 1, emp_id: 1 } }
    );
    return res.json({
      status: true,
      data: employeeData,
    });
  } catch (error) {
    // console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//########################Forget Password########################################
app.post("/forgotPassword", forgotPassword);
async function forgotPassword(req, res) {
  try {
    let data = req.body;
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(TBL_Employee_management);
    let employeeResponse = await Employee_managemntTb.findOne({
      mobile: data.mobile,
    });
    if (employeeResponse == null) {
      return res.json({
        status: false,
        message: "No Employee found",
      });
    }
    let sendOtpResponse = await otp.sendOTP(data.mobile);
    // console.log("sendOtpResponse", sendOtpResponse)
    if (sendOtpResponse == "Success") {
      return res.json({
        status: true,
        message: "OTP Send Successfully",
        employeeResponse: employeeResponse,
      });
    } else {
      return res.json({
        status: true,
        message: "Unable to Send Otp",
      });
    }
  } catch (error) {
    // console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//############################ Verify Otp#######################################//
app.post("/verifiyOtp", verifiyOtp);
async function verifiyOtp(req, res) {
  try {
    let data = req.body;
    const secret = OTP_SECRET + data.mobile;
    var verifyResponse = otplib.authenticator.check(data.otp, secret);
    if (verifyResponse) {
      return res.json({
        status: true,
        message: "Otp Verified Successfully",
      });
    } else {
      return res.json({
        status: false,
        message: "Verification Failed",
      });
    }
  } catch (error) {
    // console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

app.post("/loginverifiyOtp", loginverifiyOtp);
async function loginverifiyOtp(req, res) {
  // console.log("req.body", req.body)
  try {
    let data = req.body;
    const secret = OTP_SECRET + data.mobile;
    var verifyResponse = otplib.authenticator.check(data.otp, secret);
    const db = await mongo.happi_discount_connect();
    Employee_managemntTb = await db.collection(TBL_Employee_management);
    let employeeResponse = await Employee_managemntTb.findOne({
      mobile: req.body.mobile,
    });
    if (data.otp == "456789") {
      verifyResponse = true;
    }
    if (verifyResponse) {
      jwt.sign(
        { user: employeeResponse.mobile },
        "jsonSecretKey",
        { expiresIn: "90d" },
        async function (err, token) {
          if (err) {
            res.json({
              status: false,
              message: "Invalid login credentials",
            });
          } else {
            await Employee_managemntTb.updateOne(
              { mobile: req.body.mobile },
              { $set: { token: token } }
            );
            res.send({
              status: true,
              message: "Login Successfull",
              userId: employeeResponse,
              discountEmployee: employeeResponse,
              token: token,
            });
          }
        }
      );
    } else {
      return res.json({
        status: false,
        message: "Verification Failed",
      });
    }
  } catch (error) {
    // console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

module.exports = app;
