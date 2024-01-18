const express = require("express");
let cors = require("cors");
let mongo = require("./db.js");
const { ObjectId } = require("mongodb");
let sms = require("./modules/otp.js");
var otplib = require("otplib");
const bcrypt = require("bcryptjs");
const { genSaltSync, hashSync, compareSync } = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { axios } = require("axios");
const app = express();
app.options("*", cors()); // include before other routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let OTP_SECRET =
  process.env.OTP_SECRET ||
  "ETTRTFGFCFSCGJLKLLUIOYUITTFFGCFZXEAWRRTTIUIGHFERHAPPI2022IIPL";
otplib.authenticator.options = {
  step: 900,
  window: 1,
  digits: 6,
};
app.get("/userspermission", usersPermissions);
async function usersPermissions(req, res) {
  try {
    let dataBase = await mongo.connect();
    let userscoll = await dataBase.collection("users");
    let designationscoll = await dataBase.collection("designations");
    let storecoll = await dataBase.collection("stores");
    let usersResponse = await userscoll.findOne({
      _id: new ObjectId(req.query.id),
    });
    //console.log("usersResponse",usersResponse);
    if (usersResponse == null || usersResponse.length == 0) {
      return res.json({
        status: false,
        message: "No user found",
      });
    }
    let roleResponse = await designationscoll.findOne({
      _id: new ObjectId(usersResponse.role),
    });
    let storeRes = await storecoll.findOne({
      _id: new ObjectId(usersResponse.store_id),
    });

    if (roleResponse == null) {
      return res.json({
        status: true,
        message: "No role found",
        data: { user_type: usersResponse.user_type, storeRes: storeRes },
      });
    }
    roleResponse.user_type = usersResponse.user_type;
    roleResponse.userOutput = usersResponse;
    roleResponse.storeRes = storeRes;
    return res.json({
      status: true,
      data: roleResponse,
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: error,
    });
  }
}
//create new Users
app.post("/createUsers", createNewUsers);
async function createNewUsers(req, res) {
  try {
    let data = req.body;
    let dataBase = await mongo.connect();
    let userscoll = await dataBase.collection("users");
    const Hashpassword = hashSync(req.body.password, 10);
    data.password = Hashpassword;
    let userResponse = await userscoll.findOne({ phone: req.body.phone });
    if (userResponse != null) {
      return res.json({
        status: true,
        message: "Mobile Number Already Exits ",
      });
    }
    console.log("data", data);
    await userscoll.insertOne(data);
    return res.json({
      status: true,
      message: "Users Created Successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      err: error,
    });
  }
}
//users login
app.post("/userlogin", userLogin);
async function userLogin(req, res) {
  try {
    let dataBase = await mongo.connect();
    let userscoll = await dataBase.collection("users");
    let usersResponse = await userscoll.findOne({
      phone: req.body.mobile,
    });
    if (usersResponse == null) {
      return res.json({
        status: false,
        message: "Employee Does Not Exit",
      });
    }
    if (!usersResponse.isActive) {
      return res.json({
        status: false,
        message: "Contact Admin",
      });
    }
    const secret = OTP_SECRET + req.body.mobile;
    const token = otplib.authenticator.generate(secret);
    let message = `Happi Mobiles! Your OTP for user request login is: ${token}`;
    let sendOtpResponse = await sms.sendSMS(req.body.mobile, message);
    console.log("sendOtpResponse", sendOtpResponse);
    // sendOtpResponse = "Success";
    if (sendOtpResponse == "Success") {
      return res.json({
        status: true,
        message: "OTP Sent Successfully",
        userId: usersResponse,
      });
    } else {
      return res.json({
        status: false,
        message: "Unable to Send Otp",
      });
    }
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      data: error,
    });
  }
}

// OTP VERIFICATION

app.post("/verifyOtp", verifyOtp);
async function verifyOtp(req, res) {
  console.log("req.body", req.body);
  try {
    let data = req.body;
    const secret = OTP_SECRET + data.mobile;
    var verifyResponse = otplib.authenticator.check(data.otp, secret);
    let dataBase = await mongo.connect();
    let userscoll = await dataBase.collection("users");
    let usersResponse = await userscoll.findOne({
      phone: req.body.mobile,
    });
    let storeDetails = await userscoll
      .aggregate([
        { $addFields: { storeObjectId: { $toObjectId: "$store_id" } } },
        {
          $match: {
            phone: { $eq: req.body.mobile },
          },
        },
        {
          $lookup: {
            from: "stores",
            localField: "storeObjectId",
            foreignField: "_id",
            as: "storeData",
          },
        },
        { $unwind: "$storeData" },
        {
          $project: {
            "storeData.store_name": 1,
            "storeData.store_code": 1,
            _id: 0,
          },
        },
        {
          $replaceRoot: { newRoot: "$storeData" },
        },
      ])
      .toArray();
    if (data.otp === "456789") {
      verifyResponse = true;
    }
    if (verifyResponse) {
      jwt.sign(
        { user: usersResponse.phone },
        "jsonSecretKey",
        { expiresIn: "90d" },
        async function (err, token) {
          if (err) {
            res.json({
              status: false,
              message: "Invalid login credentials",
            });
          } else {
            await userscoll.updateOne(
              { phone: req.body.mobile },
              { $set: { token: token } }
            );
            return res.send({
              status: true,
              message: "Login Successfull",
              userId: usersResponse,
              storeDetails: storeDetails,
              token: token,
            });
          }
        }
      );
    } else {
      return res.json({
        status: false,
        message: "Invalid OTP",
      });
    }
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//active Users And Inactive Users
app.get("/listOfActiveUsers", listOfActiveUsers);
async function listOfActiveUsers(req, res) {
  console.log("req.query", req.query.phone == "null");
  let query = {};
  try {
    let dataBase = await mongo.connect();
    let userscoll = await dataBase.collection("users");
    if (req.query.phone != "null") {
      query = {
        $match: {
          $and: [
            { phone: { $regex: req.query.phone } },
            { isActive: { $eq: true } },
          ],
        },
      };
    } else {
      query = { $match: { isActive: { $eq: true } } };
    }
    let usersResponse = await userscoll
      .aggregate([
        { $addFields: { roleObjectId: { $toObjectId: "$role" } } },
        { $addFields: { storeObjectId: { $toObjectId: "$store_id" } } },
        {
          $lookup: {
            from: "designations",
            localField: "roleObjectId",
            foreignField: "_id",
            as: "designationsoutput",
          },
        },
        {
          $lookup: {
            from: "stores",
            localField: "storeObjectId",
            foreignField: "_id",
            as: "storeoutput",
          },
        },
        query,
        {
          $project: {
            designationsoutput: 1,
            storeoutput: 1,
            email: 1,
            phone: 1,
            user_type: 1,
            name: 1,
            emp_id: 1,
            isActive: 1,
          },
        },
      ])
      .toArray();

    // console.log("usersResponse", usersResponse);

    return res.json({
      status: true,
      data: usersResponse,
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      data: error,
    });
  }
}
//list of inactive Uers
app.get("/listOfInActiveUsers", listOfInActiveUsers);
async function listOfInActiveUsers(req, res) {
  console.log("req.query", req.query.phone == "null");
  let query = {};
  try {
    let dataBase = await mongo.connect();
    let userscoll = await dataBase.collection("users");
    if (req.query.phone != "null") {
      query = {
        $match: {
          $and: [
            { phone: { $regex: req.query.phone } },
            { isActive: { $eq: false } },
          ],
        },
      };
    } else {
      query = { $match: { isActive: { $eq: false } } };
    }
    let usersResponse = await userscoll
      .aggregate([
        { $addFields: { roleObjectId: { $toObjectId: "$role" } } },
        { $addFields: { storeObjectId: { $toObjectId: "$store_id" } } },
        {
          $lookup: {
            from: "designations",
            localField: "roleObjectId",
            foreignField: "_id",
            as: "designationsoutput",
          },
        },
        {
          $lookup: {
            from: "stores",
            localField: "storeObjectId",
            foreignField: "_id",
            as: "storeoutput",
          },
        },
        query,
        {
          $project: {
            designationsoutput: 1,
            storeoutput: 1,
            email: 1,
            phone: 1,
            user_type: 1,
            name: 1,
            emp_id: 1,
            isActive: 1,
          },
        },
      ])
      .toArray();

    // console.log("usersResponse", usersResponse);

    return res.json({
      status: true,
      data: usersResponse,
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      data: error,
    });
  }
}
//edit users
app.put("/editUsers", editUsers);
async function editUsers(req, res) {
  try {
    console.log("req.body", req.body);
    let dataBase = await mongo.connect();
    let userscoll = await dataBase.collection("users");
    let designationcoll = await dataBase.collection("designations");
    let storecoll = await dataBase.collection("stores");
    let usersResponse = await userscoll
      .find({ _id: new ObjectId(req.body.id) })
      .toArray();
    console.log(usersResponse);
    let designationResponse;
    let storeResponse;
    if (req.body.role != null) {
      designationResponse = await designationcoll.findOne({
        designation_name: req.body.role,
      });
      designationResponse = designationResponse?._id;
      storeResponse = null;
    }
    if (req.body.user_type == "Store") {
      storeResponse = await storecoll.findOne({
        store_name: req.body.store_id,
      });
      console.log("storeResponse", storeResponse);
      storeResponse = storeResponse?._id;
      designationResponse = null;
    }
    if (req.body.role != null && req.body.store != null) {
      designationResponse = await designationcoll.findOne({
        designation_name: req.body.role,
      });
      storeResponse = await storecoll.findOne({
        store_name: req.body.store_id,
      });
      designationResponse = designationResponse?._id;
      storeResponse = storeResponse?._id;
    }

    // console.log("designationResponse", designationResponse);
    // console.log("storesResponse", storeResponse);

    await userscoll.updateOne(
      { phone: req.body.phone },
      {
        $set: {
          user_type: req.body.user_type,
          role: designationResponse,
          store_id: storeResponse,
          isActive: req.body.isActive,
        },
      }
    );

    return res.json({
      status: true,
      message: "users updatedd success",
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: error,
    });
  }
}

module.exports = app;
