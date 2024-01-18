const express = require('express');
let cors = require('cors');
let mongo = require("./db.js");
const { ObjectId } = require('mongodb');
const res = require('express/lib/response');
const bcrypt = require('bcryptjs');
const { genSaltSync, hashSync, compareSync } = require("bcryptjs");
const jwt = require('jsonwebtoken');
const { axios } = require('axios');
const app = express();
app.options("*", cors()); // include before other routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


///------------------------get list of departments--------------------------------//
app.get('/getDepartments', getDepartments)
async function getDepartments(req, res) {
    try {
        let dataBase = await mongo.connect();
        let departmentcoll = await dataBase.collection('maindepts');
        let departmentsList = await departmentcoll.find({}).toArray();
        return res.json({
            status: true,
            data: departmentsList

        })

    }
    catch (error) {
        return res.json({
            status: false,
            message: "error"
        })
    }
}

///------------------------------get type of iisuess -----------------------------------//

app.get('/gettypeofIssues', gettypeofIssues)
async function gettypeofIssues(req, res) {
    try {
        let dataBase = await mongo.connect();
        let typeofissuesscoll = await dataBase.collection('issues');
        let issuesList = await typeofissuesscoll.find({}).toArray();
        return res.json({
            status: true,
            data: issuesList

        })

    }
    catch (error) {
        return res.json({
            status: false,
            message: "error"
        })
    }
}

module.exports = app