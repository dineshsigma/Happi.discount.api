const express = require("express");
let cors = require("cors");
const app = express();
let mongo = require("./db.js");
const { ObjectId } = require("mongodb");
const Joi = require("joi");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
let email = require("./modules/email.js");
let logsService = require("./logservice");
AWS.config.update({
  accessKeyId: "AKIASTAEMZYQ3D75TOOZ",
  secretAccessKey: "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",
  region: "ap-south-1",
});

app.use(cors());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.options("*", cors());

function validateTicket(ticket) {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    typeof_issue: Joi.string().required(),
    level: Joi.string().required(),
    dept_id: Joi.array().items(Joi.string().required()).required(),
    created_by: Joi.string().required(),
    status: Joi.string(),
    ticket_id: Joi.number(),
    designation_name: Joi.string(),
    assign_to: Joi.string().allow(null),
    attachment: Joi.array(),
    filename: Joi.array(),
  });

  return schema.validate(ticket);
}

//Increment TicketId

const getNextSequenceValue = async (sequenceName) => {
  let dataBase = await mongo.connect();
  let conterscoll = await dataBase.collection("counters");
  const sequenceDocument = await conterscoll.updateOne(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { returnOriginal: false }
  );

  return sequenceDocument.value.seq;
};

app.post("/createTickets", createTicket);
async function createTicket(req, res) {
  try {
    let data = req.body;
    const { error } = validateTicket(data);
    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });

    data.status = "649bdfd6eb11ce70f802a483";
    data.creationDate = new Date();
    data.updateDate = new Date();
    const ticketId = await getNextSequenceValue("ticketId");
    data.ticketId = ticketId;
    let dataBase = await mongo.connect();
    let ticketscoll = await dataBase.collection("tickets");
    let userscoll = await dataBase.collection("users");
    let query = { $match: { _id: { $eq: new ObjectId(data.created_by) } } };
    let usersResponse = await userscoll
      .aggregate([
        { $addFields: { storeObjectId: { $toObjectId: "$store_id" } } },
        { $addFields: { roleObjectId: { $toObjectId: "$role" } } },
        {
          $lookup: {
            from: "stores",
            localField: "storeObjectId",
            foreignField: "_id",
            as: "storeoutput",
          },
        },
        {
          $lookup: {
            from: "designations",
            localField: "roleObjectId",
            foreignField: "_id",
            as: "designationsoutput",
          },
        },
        query,
        {
          $project: {
            "storeoutput.store_name": 1,
            "designationsoutput.designation_name": 1,
            name: 1,
          },
        },
      ])
      .toArray();
    //  console.log("usersResponse", usersResponse, usersResponse);
    // console.log("usersResponse", usersResponse[0].storeoutput[0].store_name);
    let created_by;
    if (usersResponse[0].storeoutput.length > 0) {
      data.store_name = usersResponse[0].storeoutput[0].store_name;
      created_by = usersResponse[0].storeoutput[0].store_name;
    }
    if (usersResponse[0].designationsoutput.length > 0) {
      data.designation_name =
        usersResponse[0].designationsoutput[0].designation_name;
      created_by = usersResponse[0].name;
    }
    data.assign_to = null;
    // console.log("data", data);
    let userData = await userscoll
      .aggregate([
        {
          $match: {
            department: {
              $in: data.dept_id,
            },
            is_hod: true,
          },
        },
        {
          $project: {
            email: 1,
          },
        },
      ])
      .toArray();
    userData = userData.map((item, index) => {
      return item.email;
    });
    // console.log("userData", userData);
    // console.log("created_by",created_by);
    console.log("data", data);
    await ticketscoll.insertOne(data);
    await mailGenerate(data, "New Ticket", userData, created_by);
    return res.json({
      status: true,
      data: "Ticket Created Successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      status: false,
      message: "error",
    });
  }
}

//get tickets

app.get("/getTicketList", getTicketList);
async function getTicketList(req, res) {
  console.log("getTicketList", req.query);
  let id = req.query.id;
  let query = {};
  let dataBase = await mongo.connect();
  let userscoll = await dataBase.collection("users");
  let designationscoll = await dataBase.collection("designations");
  let ticketscoll = await dataBase.collection("tickets");
  let usersResponse = await userscoll.findOne({
    _id: new ObjectId(req.query.id),
  });
  let Skip = parseInt(req.query.Skip);
  let Limit = parseInt(req.query.Limit);
  if (usersResponse == null || usersResponse.length == 0) {
    return res.json({
      status: false,
      message: "No user found",
    });
  }
  let roles = await designationscoll.findOne({
    _id: new ObjectId(usersResponse.role),
  });

  let roleResponse = {};
  //console.log("usersResponse", usersResponse);
  // console.log(roles, "roles")
  if (roles == null) {
    //console.log("usersResponse",usersResponse);
    roleResponse.user_type = usersResponse.user_type;
  }
  roleResponse.user_type = usersResponse.user_type;
  if (roleResponse.user_type == "Store") {
    query = { $match: { created_by: { $eq: id } } };
    if (req.query.status != "null" && req.query.type == "mytickets") {
      query = {
        $match: {
          $and: [
            { status: { $eq: req.query.status } },
            { dept_id: { $eq: [usersResponse?.department] } },
          ],
        },
      };
    } else if (
      req.query.status != "null" &&
      req.query.type == "my_created_tickets"
    ) {
      query = {
        $match: {
          $and: [
            { status: { $eq: req.query.status } },
            { created_by: { $eq: req.query.id } },
          ],
        },
      };
    } else if (
      req.query.status != "null" &&
      req.query.type == "assignedtickets"
    ) {
      query = {
        $match: {
          $and: [
            { status: { $eq: req.query.status } },
            { assign_to: { $eq: req.query.id } },
          ],
        },
      };
    } else if (req.query.status != "null" && req.query.type == "Assigned_to") {
      query = {
        $match: {
          $and: [
            { status: { $eq: req.query.status } },
            { assign_to: { $ne: req.query.id } },
          ],
        },
      };
    } else if (req.query.type == "mytickets") {
      // query = { $match: { dept_id: { $eq: usersResponse?.department } } }
      query = { $match: { dept_id: { $in: [usersResponse?.department] } } };
    } else if (req.query.type == "my_created_tickets") {
      query = { $match: { created_by: { $eq: req.query.id } } };
    } else if (req.query.type == "assignedtickets") {
      // query = { $match: { $and: [{ assign_to: { $eq: id } }, { created_by: { $eq: id } }] } }
      query = { $match: { assign_to: { $eq: id } } };
    } else if (req.query.type == "Assigned_to") {
      query = {
        $match: {
          $and: [{ assign_to: { $ne: id } }, { assign_to: { $ne: null } }],
        },
      };
    } else if (req.query.status != "null") {
      query = {
        $match: {
          $and: [
            { status: { $eq: req.query.status } },
            { created_by: { $eq: id } },
          ],
        },
      };
    }
  } else if (roleResponse.user_type == "Corporate") {
    if (roles.user || roles.ticket_allocator) {
      query = {
        $match: {
          $or: [
            { created_by: { $eq: id } },
            { assign_to: { $eq: id } },
            { dept_id: { $eq: usersResponse.department } },
          ],
        },
      };
    }

    if (roles?.superadmin || roles?.admin) {
      query = { $match: {} };
    }
    if (req.query.status != "null" && req.query.type == "mytickets") {
      query = {
        $match: {
          $and: [
            { status: { $eq: req.query.status } },
            { dept_id: { $eq: [usersResponse?.department] } },
          ],
        },
      };
    } else if (
      req.query.status != "null" &&
      req.query.type == "my_created_tickets"
    ) {
      query = {
        $match: {
          $and: [
            { status: { $eq: req.query.status } },
            { created_by: { $eq: req.query.id } },
          ],
        },
      };
    } else if (
      req.query.status != "null" &&
      req.query.type == "assignedtickets"
    ) {
      query = {
        $match: {
          $and: [
            { status: { $eq: req.query.status } },
            { assign_to: { $eq: req.query.id } },
          ],
        },
      };
    } else if (req.query.status != "null" && req.query.type == "Assigned_to") {
      query = {
        $match: {
          $and: [
            { status: { $eq: req.query.status } },
            { assign_to: { $ne: req.query.id } },
          ],
        },
      };
    } else if (req.query.type == "mytickets") {
      // query = { $match: { dept_id: { $eq: usersResponse?.department } } }
      query = { $match: { dept_id: { $in: [usersResponse?.department] } } };
    } else if (req.query.type == "assignedtickets") {
      query = { $match: { assign_to: { $eq: id } } };
    } else if (req.query.type == "Assigned_to") {
      query = {
        $match: {
          $and: [{ assign_to: { $ne: id } }, { assign_to: { $ne: null } }],
        },
      };
    } else if (req.query.status != "null") {
      query = { $match: { status: { $eq: req.query.status } } };
    } else if (req.query.type == "my_created_tickets") {
      query = { $match: { created_by: { $eq: req.query.id } } };
    }

    //user and admin permissosns
    // if (roles.user || roles.ticket_allocator) {
    //   query = { $match: { $or: [{ created_by: { $eq: id } }, { assign_to: { $eq: id } }, { dept_id: { $eq: usersResponse.department } }] } }
    // }
  }
  //console.log("query", query);

  //console.log(Object.keys(query).length)
  let ticketResponse;

  //console.log("Object.keys(query).length", Object.keys(query).length)

  if (Object.keys(query).length > 0) {
    ticketResponse = await ticketscoll
      .aggregate([
        { $addFields: { userObjectId: { $toObjectId: "$created_by" } } },
        { $addFields: { issuesObjectId: { $toObjectId: "$typeof_issue" } } },
        { $addFields: { statusObjectId: { $toObjectId: "$status" } } },
        // { "$addFields": { "deptObjectId": { "$toObjectId": "$dept_id" } } },
        {
          $addFields: {
            dept_id: {
              $map: { input: "$dept_id", in: { $toObjectId: "$$this" } },
            },
          },
        },
        { $addFields: { assignObjectId: { $toObjectId: "$assign_to" } } },
        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "useroutput",
          },
        },
        {
          $lookup: {
            from: "issues",
            localField: "issuesObjectId",
            foreignField: "_id",
            as: "issuesoutput",
          },
        },
        {
          $lookup: {
            from: "status",
            localField: "statusObjectId",
            foreignField: "_id",
            as: "statusoutput",
          },
        },
        {
          $lookup: {
            from: "maindepts",
            localField: "dept_id",
            foreignField: "_id",
            as: "departmentoutput",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignObjectId",
            foreignField: "_id",
            as: "assignoutput",
          },
        },

        query,
        {
          $project: {
            useroutput: 1,
            issuesoutput: 1,
            statusoutput: 1,
            departmentoutput: 1,
            "assignoutput.name": 1,
            "assignoutput.email": 1,
            ticketId: 1,
            title: 1,
            description: 1,
            level: 1,
            creationDate: 1,
            updateDate: 1,
            assign_to: 1,
            store_name: 1,
            "assignoutput._id": 1,
            designation_name: 1,
            attachment: 1,
            filename: 1,
            department_names: {
              $map: {
                input: "$departmentoutput",
                as: "dept",
                in: "$$dept.mainDeptName",
              },
            },
          },
        },
      ])
      .sort({ ticketId: -1 })
      .toArray();
  } else {
    ticketResponse = await ticketscoll
      .aggregate([
        { $addFields: { userObjectId: { $toObjectId: "$created_by" } } },
        { $addFields: { issuesObjectId: { $toObjectId: "$typeof_issue" } } },
        { $addFields: { statusObjectId: { $toObjectId: "$status" } } },
        // { "$addFields": { "deptObjectId": { "$toObjectId": "$dept_id" } } },
        {
          $addFields: {
            dept_id: {
              $map: { input: "$dept_id", in: { $toObjectId: "$$this" } },
            },
          },
        },
        { $addFields: { assignObjectId: { $toObjectId: "$assign_to" } } },

        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "useroutput",
          },
        },
        {
          $lookup: {
            from: "issues",
            localField: "issuesObjectId",
            foreignField: "_id",
            as: "issuesoutput",
          },
        },
        {
          $lookup: {
            from: "status",
            localField: "statusObjectId",
            foreignField: "_id",
            as: "statusoutput",
          },
        },
        {
          $lookup: {
            from: "maindepts",
            localField: "dept_id",
            foreignField: "_id",
            as: "departmentoutput",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignObjectId",
            foreignField: "_id",
            as: "assignoutput",
          },
        },
        query,
        {
          $project: {
            useroutput: 1,
            issuesoutput: 1,
            statusoutput: 1,
            departmentoutput: 1,
            "assignoutput.name": 1,
            "assignoutput.email": 1,
            "assignoutput._id": 1,
            ticketId: 1,
            title: 1,
            description: 1,
            level: 1,
            creationDate: 1,
            updateDate: 1,
            assign_to: 1,
            store_name: 1,
            designation_name: 1,
            department_names: {
              $map: {
                input: "$departmentoutput",
                as: "dept",
                in: "$$dept.mainDeptName",
              },
            },
          },
        },
      ])
      .sort({ ticketId: -1 })
      .toArray();
  }

  return res.json({
    status: true,
    data: ticketResponse,
    count: ticketResponse?.length,
  });
}

//Edit Tickets

app.put("/editTickets", editTickets);
async function editTickets(req, res) {
  try {
    let body = req.body;
    // console.log("editTicket", body);
    const { error } = validateTicket(body);
    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });
    let dataBase = await mongo.connect();
    let ticketscoll = await dataBase.collection("tickets");
    let statuscoll = await dataBase.collection("status");
    let userscoll = await dataBase.collection("users");
    // let tagscoll = await dataBase.collection('tags');
    let ticketResponse = await ticketscoll.findOne({
      ticketId: req.body.ticket_id,
    });
    //console.log(ticketResponse.created_by, "ticketResponse")
    //console.log("ticketResponse?.created_by == body.assign_to", ticketResponse?.created_by == body.assign_to)
    if (body.assign_to != null) {
      if (ticketResponse?.created_by == body.assign_to) {
        return res.json({
          status: false,
          message: "Ticket can`t be Assigned to same user",
        });
      }
    }
    // let statusResponse = await statuscoll.findOne({ "status_name": req.body.status })
    let statusResponse = await statuscoll.findOne({
      _id: new ObjectId(req.body.status),
    });
    // console.log("statusResponse", statusResponse._id.toString())

    //user deatils

    let query = {
      $match: { _id: { $eq: new ObjectId(ticketResponse?.created_by) } },
    };
    let usersResponse = await userscoll
      .aggregate([
        { $addFields: { storeObjectId: { $toObjectId: "$store_id" } } },
        { $addFields: { roleObjectId: { $toObjectId: "$role" } } },
        {
          $lookup: {
            from: "stores",
            localField: "storeObjectId",
            foreignField: "_id",
            as: "storeoutput",
          },
        },
        {
          $lookup: {
            from: "designations",
            localField: "roleObjectId",
            foreignField: "_id",
            as: "designationsoutput",
          },
        },
        query,
        {
          $project: {
            "storeoutput.store_name": 1,
            "designationsoutput.designation_name": 1,
            name: 1,
          },
        },
      ])
      .toArray();
    //  console.log("usersResponse", usersResponse, usersResponse);
    // console.log("usersResponse", usersResponse[0].storeoutput[0].store_name);
    let created_by;

    if (usersResponse[0].storeoutput.length > 0) {
      body.store_name = usersResponse[0].storeoutput[0].store_name;
      created_by = usersResponse[0].storeoutput[0].store_name;
    }
    if (usersResponse[0].designationsoutput.length > 0) {
      body.designation_name =
        usersResponse[0].designationsoutput[0].designation_name;
      created_by = usersResponse[0].name;
    }
    let userData = await userscoll
      .aggregate([
        {
          $match: {
            department: {
              $in: body.dept_id,
            },
            is_hod: true,
          },
        },
        {
          $project: {
            email: 1,
          },
        },
      ])
      .toArray();
    userData = userData.map((item, index) => {
      return item.email;
    });

    body.ticketId = req.body.ticket_id;
    await mailGenerate(body, "Update Ticket", userData, created_by);
    await ticketscoll.updateOne(
      { ticketId: req.body.ticket_id },
      {
        $set: {
          level: req.body.level,
          status: statusResponse?._id.toString(),
          assign_to: req.body.assign_to,
          updateDate: new Date(),
          title: req.body.title,
          typeof_issue: req.body.typeof_issue,
          dept_id: req.body.dept_id,
        },
      }
    );
    return res.json({
      status: true,
      message: "Edit tickets successfully",
    });
  } catch (error) {
    console.log("error", error);
    logsService.log("error", req, error + "");
    return res.json({
      status: false,
      message: "ERROR",
    });
  }
}

//get comments
app.get("/getComments", getComments);
async function getComments(req, res) {
  try {
    //console.log("query", req.query);
    let dataBase = await mongo.connect();
    let comments = await dataBase.collection("comments");
    let data = [];
    let userscommentsResponse = await comments
      .aggregate([
        { $addFields: { userObjectId: { $toObjectId: "$created_by" } } },
        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "useroutput",
          },
        },
        {
          $match: {
            $and: [{ ticket_id: { $eq: parseInt(req.query.ticket_id) } }],
          },
        },
        {
          $project: {
            "useroutput.name": 1,
            "useroutput.email": 1,
            description: 1,
            ticket_id: 1,
            record: 1,
            creationDate: 1,
            attachment:1,
            file_name:1
          },
        },
      ])
      .sort({ creationDate: 1 })
      .toArray();
    // // console.log("userscommentsResponse", userscommentsResponse);
    // data.push({ userscommentsResponse: userscommentsResponse });
    return res.json({
      status: true,
      data: userscommentsResponse,
    });
  } catch (error) {
    //console.log("error", error);
    return res.json({
      status: false,
      message: error,
    });
  }
}

//get comments by ticketId
app.get("/getCommentsByTicketId", getCommentsByTicketId);
async function getCommentsByTicketId(req, res) {
  try {
    // console.log("query", req.query);
    let dataBase = await mongo.connect();
    let comments = await dataBase.collection("comments");
    let commentsResponse = await comments
      .aggregate([
        { $addFields: { userObjectId: { $toObjectId: "$created_by" } } },
        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "useroutput",
          },
        },
        {
          $match: {
            $and: [
              { created_by: { $ne: req.query.created_by } },
              { ticket_id: { $eq: parseInt(req.query.ticket_id) } },
            ],
          },
        },

        {
          $project: {
            "useroutput.name": 1,
            description: 1,
            ticket_id: 1,
            record: 1,
            creationDate: 1,
          },
        },
      ])
      .toArray();

    return res.json({
      status: true,
      data: commentsResponse,
    });
  } catch (error) {
    // console.log("error", error);
    return res.json({
      status: false,
      message: error,
    });
  }
}

//add comments
app.post("/addComments", addComments);
async function addComments(req, res) {
  try {
    //console.log("req.bbb", req.body);
    let dataBase = await mongo.connect();
    let comments = await dataBase.collection("comments");
    if (req.body.record == null) {
      await comments.insertOne(req.body);
      return res.json({
        status: true,
        message: "Comments Addedd Successfully",
      });
    } else {
      let reqdata = req.body;
      let uuid = uuidv4();
      const base64String = req.body.record;
      const base64Data = base64String.replace(
        /^data:audio\/\w+;codecs=opus;base64,/,
        ""
      );
      const binaryBuffer = Buffer.from(base64Data, "base64");
      const s3 = new AWS.S3();
      const bucketName = "happimobiles";
      const key = `happi-ticket-audiofiles/${uuid}.opus`;
      const params = {
        Bucket: bucketName,
        Key: key,
        Body: binaryBuffer,
        ACL: "public-read",
      };
      s3.upload(params, async (err, data) => {
        if (err) {
          console.error("Error uploading the file to S3:", err);
        } else {
          //console.log('File uploaded successfully to S3!');
          //console.log('S3 URL:', data.Location);
          reqdata.record = data.Location;
          // delete reqdata.record;
          await comments.insertOne({
            comment_type: req.body.comment_type,
            description: "",
            created_by: req.body.created_by,
            ticket_id: req.body.ticket_id,
            creationDate: req.body.creationDate,
            record: data.Location,
          });
          return res.json({
            status: true,
            message: "Comments Addedd Successfully",
          });
        }
      });
    }
  } catch (error) {
    // console.log("error", error);
    return res.json({
      status: false,
      message: error,
    });
  }
}

//get ticket list in mobile

app.get("/getTicketListMobileApp", getTicketListMobileApp);
async function getTicketListMobileApp(req, res) {
  // console.log("req.query", req.query);
  let id = req.query.id;
  let query = {};
  let dataBase = await mongo.connect();
  let userscoll = await dataBase.collection("users");
  let designationscoll = await dataBase.collection("designations");
  let ticketscoll = await dataBase.collection("tickets");
  let usersResponse = await userscoll.findOne({
    _id: new ObjectId(req.query.id),
  });
  let Skip = parseInt(req.query.Skip);
  let Limit = parseInt(req.query.Limit);
  if (usersResponse == null || usersResponse.length == 0) {
    return res.json({
      status: false,
      message: "No user found",
    });
  }
  let roles = await designationscoll.findOne({
    _id: new ObjectId(usersResponse.role),
  });
  let totalData = 0;
  let roleResponse = {};
  // console.log("usersResponse", usersResponse);
  //console.log(roles, "roles")
  if (roles == null) {
    // console.log("usersResponse", usersResponse);
    roleResponse.user_type = usersResponse.user_type;
  }
  roleResponse.user_type = usersResponse.user_type;
  if (roleResponse.user_type == "Store") {
    query = { $match: { created_by: { $eq: id } } };
  } else if (roleResponse.user_type == "Corporate") {
    if (roles?.superadmin || roles?.admin) {
      query = { $match: {} };
      totalData = await ticketscoll.find({}).toArray();
      // console.log("totalData", totalData)
    }

    //user and admin permissosns
    else if (roles.user || roles.ticket_allocator) {
      query = {
        $match: {
          $or: [
            { created_by: { $eq: id } },
            { assign_to: { $eq: id } },
            { dept_id: { $eq: usersResponse.department } },
          ],
        },
      };
      totalData = await ticketscoll.find({ created_by: { $eq: id } }).toArray();
    }
  }
  //console.log("query", query);

  //console.log(Object.keys(query).length)
  let ticketResponse;
  let pageNumber = parseInt(req.query.pageNumber);
  //let pageNumber=2
  let limit = 4;

  let skip = limit * (pageNumber - 1);

  if (Object.keys(query).length > 0) {
    ticketResponse = await ticketscoll
      .aggregate([
        { $addFields: { userObjectId: { $toObjectId: "$created_by" } } },
        { $addFields: { issuesObjectId: { $toObjectId: "$typeof_issue" } } },
        { $addFields: { statusObjectId: { $toObjectId: "$status" } } },
        { $addFields: { deptObjectId: { $toObjectId: "$dept_id" } } },
        { $addFields: { assignObjectId: { $toObjectId: "$assign_to" } } },
        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "useroutput",
          },
        },
        {
          $lookup: {
            from: "issues",
            localField: "issuesObjectId",
            foreignField: "_id",
            as: "issuesoutput",
          },
        },
        {
          $lookup: {
            from: "status",
            localField: "statusObjectId",
            foreignField: "_id",
            as: "statusoutput",
          },
        },
        {
          $lookup: {
            from: "maindepts",
            localField: "deptObjectId",
            foreignField: "_id",
            as: "departmentoutput",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignObjectId",
            foreignField: "_id",
            as: "assignoutput",
          },
        },

        query,
        {
          $project: {
            useroutput: 1,
            issuesoutput: 1,
            statusoutput: 1,
            departmentoutput: 1,
            "assignoutput.name": 1,
            ticketId: 1,
            title: 1,
            description: 1,
            level: 1,
            creationDate: 1,
            updateDate: 1,
            assign_to: 1,
            store_name: 1,
            designation_name: 1,
            level: 1,
          },
        },
      ])
      .sort({ creationDate: -1 })
      .skip(skip || 0)
      .limit(limit || 5)
      .toArray();
  } else {
    ticketResponse = await ticketscoll
      .aggregate([
        { $addFields: { userObjectId: { $toObjectId: "$created_by" } } },
        { $addFields: { issuesObjectId: { $toObjectId: "$typeof_issue" } } },
        { $addFields: { statusObjectId: { $toObjectId: "$status" } } },
        { $addFields: { deptObjectId: { $toObjectId: "$dept_id" } } },
        { $addFields: { assignObjectId: { $toObjectId: "$assign_to" } } },

        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "useroutput",
          },
        },
        {
          $lookup: {
            from: "issues",
            localField: "issuesObjectId",
            foreignField: "_id",
            as: "issuesoutput",
          },
        },
        {
          $lookup: {
            from: "status",
            localField: "statusObjectId",
            foreignField: "_id",
            as: "statusoutput",
          },
        },
        {
          $lookup: {
            from: "maindepts",
            localField: "deptObjectId",
            foreignField: "_id",
            as: "departmentoutput",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignObjectId",
            foreignField: "_id",
            as: "assignoutput",
          },
        },

        {
          $project: {
            useroutput: 1,
            issuesoutput: 1,
            statusoutput: 1,
            departmentoutput: 1,
            "assignoutput.name": 1,
            ticketId: 1,
            title: 1,
            description: 1,
            level: 1,
            creationDate: 1,
            updateDate: 1,
            assign_to: 1,
            store_name: 1,
            designation_name: 1,
          },
        },
      ])
      .sort({ creationDate: -1 })
      .skip(skip || 0)
      .limit(limit || 5)
      .toArray();
    // totalData = await ticketscoll.find({ created_by: { $eq: id } }).toArray();
  }
  //console.log("totalData", totalData.length);
  let skipcount = totalData.length / limit;

  return res.json({
    status: true,
    skipcount: Math.ceil(skipcount),
    data: ticketResponse,
    count: ticketResponse?.length,
  });
}

async function mailGenerate(data, ticketStatus, userData, created_by) {
  // console.log("data", data);
  let emailId = [];
  let phoneNo = [];
  let subject = `Happi Ticket ${data.ticketId}`;
  let body = "";
  let phBody = "";
  attachments = [];
  let ticketData;
  let dataBase = await mongo.connect();
  let ticketscoll = await dataBase.collection("tickets");
  let usercoll = await dataBase.collection("users");
  let statuscoll = await dataBase.collection("status");
  let designationscoll = await dataBase.collection("designations");
  ticketData = await ticketscoll
    .aggregate([
      { $addFields: { userObjectId: { $toObjectId: "$created_by" } } },
      { $addFields: { issuesObjectId: { $toObjectId: "$typeof_issue" } } },
      { $addFields: { statusObjectId: { $toObjectId: "$status" } } },
      // { "$addFields": { "deptObjectId": { "$toObjectId": "$dept_id" } } },
      {
        $addFields: {
          dept_id: {
            $map: { input: "$dept_id", in: { $toObjectId: "$$this" } },
          },
        },
      },
      { $addFields: { assignObjectId: { $toObjectId: "$assign_to" } } },

      {
        $lookup: {
          from: "users",
          localField: "userObjectId",
          foreignField: "_id",
          as: "useroutput",
        },
      },
      {
        $lookup: {
          from: "issues",
          localField: "issuesObjectId",
          foreignField: "_id",
          as: "issuesoutput",
        },
      },
      {
        $lookup: {
          from: "status",
          localField: "statusObjectId",
          foreignField: "_id",
          as: "statusoutput",
        },
      },
      {
        $lookup: {
          from: "maindepts",
          localField: "dept_id",
          foreignField: "_id",
          as: "departmentoutput",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assignObjectId",
          foreignField: "_id",
          as: "assignoutput",
        },
      },
      { $match: { ticketId: { $eq: data.ticketId } } },

      {
        $project: {
          useroutput: 1,
          issuesoutput: 1,
          statusoutput: 1,
          departmentoutput: 1,
          "assignoutput.name": 1,
          ticketId: 1,
          title: 1,
          description: 1,
          level: 1,
          creationDate: 1,
          updateDate: 1,
          assign_to: 1,
          store_name: 1,
          designation_name: 1,
        },
      },
    ])
    .toArray();
  // console.log("ticketData", ticketData)

  let statusResponse = await statuscoll.findOne({ status_name: data.status });
  // let assignedUserResponse = await usercoll.findOne({ email: data.assign_to });
  let assignedUserResponse = await usercoll.findOne({
    _id: new ObjectId(data.assign_to),
  });
  console.log("assignedUserResponse---", assignedUserResponse);
  // console.log("assignedUserResponse", assignedUserResponse.name);
  if (ticketStatus == "Update Ticket") {
    // console.log(statusResponse?.status_name == ticketData[0]?.statusoutput[0]?.status_name)
    body += "<b>TicketId:</b> " + ticketData[0]?.ticketId + "<br/>";
    body += "<b>Title:</b> " + ticketData[0]?.title + "<br/>";
    // body += "<b>Department Name:</b> " + ticketData[0]?.departmentoutput[0]?.mainDeptName + '<br/>';
    body +=
      "<b>Type Of Issue:</b> " +
      ticketData[0]?.issuesoutput[0]?.issue_name +
      "<br/>";
    body +=
      statusResponse?.status_name == ticketData[0]?.statusoutput[0]?.status_name
        ? "<b>Ticket Status:</b> " +
          ticketData[0]?.statusoutput[0]?.status_name +
          "<br/>"
        : `<b> Status has been changed from   ${ticketData[0]?.statusoutput[0]?.status_name}  to :</b> ` +
          statusResponse?.status_name +
          "<br/>";
    body += "<b>Priority Level:</b> " + ticketData[0]?.level + "<br/>";
    body += "<b>Description:</b> " + ticketData[0]?.description + "<br/>";
    body += "<b>Creation Date:</b> " + ticketData[0]?.creationDate + "<br/>";
    body += "<b>CreatedBy:</b> " + created_by + "<br/>";
    if (data.assign_to != null && data.assign_to != undefined) {
      userData.push(assignedUserResponse?.email);
      body += "<b>Assigned_to:</b> " + assignedUserResponse?.name + "<br/>";
    }
  }
  //console.log("body", body);
  body += "<b>TicketId:</b> " + ticketData[0]?.ticketId + "<br/>";
  body += "<b>Title:</b> " + ticketData[0]?.title + "<br/>";
  // body += "<b>Department Name:</b> " + ticketData[0]?.departmentoutput[0]?.mainDeptName + '<br/>';
  body +=
    "<b>Type Of Issue:</b> " +
    ticketData[0]?.issuesoutput[0]?.issue_name +
    "<br/>";
  body +=
    "<b>Ticket Status:</b> " +
    ticketData[0]?.statusoutput[0]?.status_name +
    "<br/>";
  body += "<b>Priority Level:</b> " + ticketData[0]?.level + "<br/>";
  body += "<b>Description:</b> " + ticketData[0]?.description + "<br/>";
  body += "<b>Creation Date:</b> " + ticketData[0]?.creationDate + "<br/>";
  body += "<b>CreatedBy:</b> " + created_by + "<br/>";

  userData = userData.filter((email) => {
    return email !== undefined;
  });
  // console.log("userData", userData);;

  if (userData.length !== 0)
    await email.send_mail(userData, subject, body, attachments);
}

async function mailGenerateWeb(data, ticketStatus, userData, created_by) {
  // console.log("data", data);
  let emailId = [];
  let phoneNo = [];
  let subject = `Happi Ticket ${data.ticketId}`;
  let body = "";
  let phBody = "";
  attachments = [];
  let ticketData;
  let dataBase = await mongo.connect();
  let ticketscoll = await dataBase.collection("tickets");
  let usercoll = await dataBase.collection("users");
  let statuscoll = await dataBase.collection("status");
  let designationscoll = await dataBase.collection("designations");
  ticketData = await ticketscoll
    .aggregate([
      { $addFields: { userObjectId: { $toObjectId: "$created_by" } } },
      { $addFields: { issuesObjectId: { $toObjectId: "$typeof_issue" } } },
      { $addFields: { statusObjectId: { $toObjectId: "$status" } } },
      // { "$addFields": { "deptObjectId": { "$toObjectId": "$dept_id" } } },
      {
        $addFields: {
          dept_id: {
            $map: { input: "$dept_id", in: { $toObjectId: "$$this" } },
          },
        },
      },
      { $addFields: { assignObjectId: { $toObjectId: "$assign_to" } } },

      {
        $lookup: {
          from: "users",
          localField: "userObjectId",
          foreignField: "_id",
          as: "useroutput",
        },
      },
      {
        $lookup: {
          from: "issues",
          localField: "issuesObjectId",
          foreignField: "_id",
          as: "issuesoutput",
        },
      },
      {
        $lookup: {
          from: "status",
          localField: "statusObjectId",
          foreignField: "_id",
          as: "statusoutput",
        },
      },
      {
        $lookup: {
          from: "maindepts",
          localField: "dept_id",
          foreignField: "_id",
          as: "departmentoutput",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assignObjectId",
          foreignField: "_id",
          as: "assignoutput",
        },
      },
      { $match: { ticketId: { $eq: data.ticketId } } },

      {
        $project: {
          useroutput: 1,
          issuesoutput: 1,
          statusoutput: 1,
          departmentoutput: 1,
          "assignoutput.name": 1,
          ticketId: 1,
          title: 1,
          description: 1,
          level: 1,
          creationDate: 1,
          updateDate: 1,
          assign_to: 1,
          store_name: 1,
          designation_name: 1,
        },
      },
    ])
    .toArray();
  // console.log("ticketData", ticketData)

  let statusResponse = await statuscoll.findOne({ status_name: data.status });
  let assignedUserResponse = await usercoll.findOne({ email: data.assign_to });
  // let assignedUserResponse = await usercoll.findOne({ _id: new ObjectId(data.assign_to) });
  // console.log("assignedUserResponse---", assignedUserResponse);
  // console.log("assignedUserResponse", assignedUserResponse.name);
  if (ticketStatus == "Update Ticket") {
    // console.log(statusResponse?.status_name == ticketData[0]?.statusoutput[0]?.status_name)
    body += "<b>TicketId:</b> " + ticketData[0]?.ticketId + "<br/>";
    body += "<b>Title:</b> " + ticketData[0]?.title + "<br/>";
    // body += "<b>Department Name:</b> " + ticketData[0]?.departmentoutput[0]?.mainDeptName + '<br/>';
    body +=
      "<b>Type Of Issue:</b> " +
      ticketData[0]?.issuesoutput[0]?.issue_name +
      "<br/>";
    body +=
      statusResponse?.status_name == ticketData[0]?.statusoutput[0]?.status_name
        ? "<b>Ticket Status:</b> " +
          ticketData[0]?.statusoutput[0]?.status_name +
          "<br/>"
        : `<b> Status has been changed from   ${ticketData[0]?.statusoutput[0]?.status_name}  to :</b> ` +
          statusResponse?.status_name +
          "<br/>";
    body += "<b>Priority Level:</b> " + ticketData[0]?.level + "<br/>";
    body += "<b>Description:</b> " + ticketData[0]?.description + "<br/>";
    body += "<b>Creation Date:</b> " + ticketData[0]?.creationDate + "<br/>";
    body += "<b>CreatedBy:</b> " + created_by + "<br/>";
    if (data.assign_to != null && data.assign_to != undefined) {
      userData.push(assignedUserResponse?.email);
      body += "<b>Assigned_to:</b> " + assignedUserResponse?.name + "<br/>";
    }
  }
  //console.log("body", body);
  body += "<b>TicketId:</b> " + ticketData[0]?.ticketId + "<br/>";
  body += "<b>Title:</b> " + ticketData[0]?.title + "<br/>";
  // body += "<b>Department Name:</b> " + ticketData[0]?.departmentoutput[0]?.mainDeptName + '<br/>';
  body +=
    "<b>Type Of Issue:</b> " +
    ticketData[0]?.issuesoutput[0]?.issue_name +
    "<br/>";
  body +=
    "<b>Ticket Status:</b> " +
    ticketData[0]?.statusoutput[0]?.status_name +
    "<br/>";
  body += "<b>Priority Level:</b> " + ticketData[0]?.level + "<br/>";
  body += "<b>Description:</b> " + ticketData[0]?.description + "<br/>";
  body += "<b>Creation Date:</b> " + ticketData[0]?.creationDate + "<br/>";
  body += "<b>CreatedBy:</b> " + created_by + "<br/>";

  // console.log("userData2", userData);
  userData = userData.filter((email) => {
    return email !== undefined;
  });
  // console.log("userData", userData);
  // console.log("userData", userData);

  if (userData.length !== 0)
    await email.send_mail(userData, subject, body, attachments);
}

app.get("/getTicketById", getTicketById);
async function getTicketById(req, res) {
  //console.log("req.query.ticketId", req.query.ticketId)
  let ticketId = req.query.ticketId;
  //console.log("ticketId", ticketId);
  try {
    let dataBase = await mongo.connect();
    let ticketscoll = await dataBase.collection("tickets");
    let ticketData = await ticketscoll
      .aggregate([
        { $addFields: { userObjectId: { $toObjectId: "$created_by" } } },
        { $addFields: { issuesObjectId: { $toObjectId: "$typeof_issue" } } },
        { $addFields: { statusObjectId: { $toObjectId: "$status" } } },
        { $addFields: { deptObjectId: { $toObjectId: "$dept_id" } } },
        { $addFields: { assignObjectId: { $toObjectId: "$assign_to" } } },

        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "useroutput",
          },
        },
        {
          $lookup: {
            from: "issues",
            localField: "issuesObjectId",
            foreignField: "_id",
            as: "issuesoutput",
          },
        },
        {
          $lookup: {
            from: "status",
            localField: "statusObjectId",
            foreignField: "_id",
            as: "statusoutput",
          },
        },
        {
          $lookup: {
            from: "maindepts",
            localField: "deptObjectId",
            foreignField: "_id",
            as: "departmentoutput",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignObjectId",
            foreignField: "_id",
            as: "assignoutput",
          },
        },
        { $match: { ticketId: { $eq: parseInt(ticketId) } } },

        {
          $project: {
            useroutput: 1,
            issuesoutput: 1,
            statusoutput: 1,
            departmentoutput: 1,
            "assignoutput.name": 1,
            ticketId: 1,
            title: 1,
            description: 1,
            level: 1,
            creationDate: 1,
            updateDate: 1,
            assign_to: 1,
            store_name: 1,
            designation_name: 1,
            attachment: 1,
          },
        },
      ])
      .toArray();
    return res.json({
      status: true,
      data: ticketData,
    });
  } catch (error) {
    return res.json({
      status: false,
      message: error,
    });
  }
}

app.get("/userDropDown", userDropDown);
async function userDropDown(req, res) {
  try {
    let dataBase = await mongo.connect();
    let ticketscoll = await dataBase.collection("users");
    let ticketResponse = await ticketscoll
      .aggregate([
        { $addFields: { userObjectId: { $toObjectId: "$store_id" } } },

        {
          $lookup: {
            from: "stores",
            localField: "userObjectId",
            foreignField: "_id",
            as: "storeoutput",
          },
        },
        { $match: { isActive: { $eq: true } } },
        {
          $project: {
            "storeoutput.store_name": 1,
            name: 1,
            email: 1,
            phone: 1,
          },
        },
      ])
      .toArray();

    return res.json({
      sttaus: true,
      data: ticketResponse,
    });
  } catch (error) {
    // console.log("error", error);
    return res.json({
      status: false,
      message: error,
    });
  }
}

///------------------------------get List of priorities---------------------------------------///
app.get("/getPriorities", getPriorities);
async function getPriorities(req, res) {
  const dataBase = await mongo.connect();
  const priority = await dataBase.collection("priority");
  const data = await priority.find({}).toArray();
  return res.json({
    status: true,
    data: data,
  });
}

//--------------------------get list of status drop down ------------------------------------///
app.get("/getStatusList", getStatusList);
async function getStatusList(req, res) {
  try {
    const dataBase = await mongo.connect();
    const status = await dataBase.collection("status");
    const data = await status.find({}).sort({ _id: -1 }).toArray();
    return res.json({
      status: true,
      data: data,
    });
  } catch (error) {
    //console.log("error", error);
    return res.json({
      status: false,
      message: "error",
    });
  }
}

///   edit ticket

app.put("/editTicketsWeb", editTicketsWeb);
async function editTicketsWeb(req, res) {
  try {
    let body = req.body;
    let data = req.body;
    console.log("editTicket", body);
    let dataBase = await mongo.connect();
    let ticketscoll = await dataBase.collection("tickets");
    let statuscoll = await dataBase.collection("status");
    let userscoll = await dataBase.collection("users");
    let issuecoll = await dataBase.collection("issues");
    let maindeptcoll = await dataBase.collection("maindepts");
    // let tagscoll = await dataBase.collection('tags');
    let ticketResponse = await ticketscoll.findOne({
      ticketId: req.body.ticket_id,
    });
    // console.log(ticketResponse.created_by, "ticketResponse")
    //console.log("ticketResponse?.created_by == body.assign_to", ticketResponse?.created_by == body.assign_to)
    if (body.assign_to != null) {
      if (ticketResponse?.created_by == body.assign_to) {
        return res.json({
          status: false,
          message: "Ticket can`t be Assigned to same user",
        });
      }
    }
    let statusResponse = await statuscoll.findOne({
      status_name: req.body.status,
    });
    // console.log("statusResponse", statusResponse._id.toString())

    //user deatils

    let query = {
      $match: { _id: { $eq: new ObjectId(ticketResponse?.created_by) } },
    };
    let usersResponse = await userscoll
      .aggregate([
        { $addFields: { storeObjectId: { $toObjectId: "$store_id" } } },
        { $addFields: { roleObjectId: { $toObjectId: "$role" } } },
        {
          $lookup: {
            from: "stores",
            localField: "storeObjectId",
            foreignField: "_id",
            as: "storeoutput",
          },
        },
        {
          $lookup: {
            from: "designations",
            localField: "roleObjectId",
            foreignField: "_id",
            as: "designationsoutput",
          },
        },
        query,
        {
          $project: {
            "storeoutput.store_name": 1,
            "designationsoutput.designation_name": 1,
            name: 1,
          },
        },
      ])
      .toArray();
    //  console.log("usersResponse", usersResponse, usersResponse);
    // console.log("usersResponse", usersResponse[0].storeoutput[0].store_name);
    let created_by;

    if (usersResponse[0].storeoutput.length > 0) {
      body.store_name = usersResponse[0].storeoutput[0].store_name;
      created_by = usersResponse[0].storeoutput[0].store_name;
    }
    if (usersResponse[0].designationsoutput.length > 0) {
      body.designation_name =
        usersResponse[0].designationsoutput[0].designation_name;
      created_by = usersResponse[0].name;
    }
    let userData = await userscoll
      .aggregate([
        {
          $match: {
            department: {
              $in: data.dept_id,
            },
            is_hod: true,
          },
        },
        {
          $project: {
            email: 1,
          },
        },
      ])
      .toArray();
    userData = userData.map((item, index) => {
      return item.email;
    });
    body.ticketId = req.body.ticket_id;

    // console.log("data", data);
    let issueData = await issuecoll.findOne({ issue_name: data.typeof_issue });
    // console.log(issueData, issueData);
    //console.log("issueData", issueData?._id);
    let departmentNames = await maindeptcoll
      .aggregate([
        {
          $match: {
            mainDeptName: {
              $in: data.dept_id,
            },
          },
        },
      ])
      .toArray();

    departmentNames = departmentNames.map((item, index) => {
      return item._id;
    });
    //console.log("departmentNames", departmentNames);
    await mailGenerateWeb(body, "Update Ticket", userData, created_by);

    let assign_Details = await userscoll.findOne({ email: req.body.assign_to });
    //console.log("assign_Details", assign_Details?._id);

    await ticketscoll.updateOne(
      { ticketId: req.body.ticket_id },
      {
        $set: {
          level: req.body.level,
          status: statusResponse?._id.toString(),
          assign_to: assign_Details?._id,
          updateDate: new Date(),
          title: req.body.title,
          typeof_issue: issueData?._id,
          dept_id: departmentNames,
        },
      }
    );
    return res.json({
      status: true,
      message: "Edit tickets successfully",
    });
  } catch (error) {
    //console.log("error", error);
    return res.json({
      status: error,
      message: error,
    });
  }
}

app.post("/addCommentsMobile", addCommentsMobile);
async function addCommentsMobile(req, res) {
  try {
    // console.log("req.bbb", req.body);
    const dataBase = await mongo.connect();
    const comments = await dataBase.collection("comments");

    await comments.insertOne(req.body);
    res.json({ status: true, message: "Comments Addedd Successfully" });
  } catch (error) {
    //console.log("error", error);
    res.json({ status: false, message: error });
  }
}
module.exports = app;
