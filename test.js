// let express = require("express");
// let app = express();
// var qs = require("qs");
// let mongo = require("../db.js");
// let axios = require("axios");
// const { ObjectId } = require("mongodb");
// const { v4: uuidv4 } = require("uuid");
// let apxPrice = require("../apxmodules/apxapi.js");
// let checkAvailabilityStock = require("../apxmodules/checkstock.js");

// // #########  ENTER INVOICE NUMBER AND INVOICE DATE TO GET ORDER DETAILS FROM APX API ##################//
// app.post("/orderDetails", OrderDetails);
// async function OrderDetails(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_tb = await dataBase.collection("sale_return");
//     let store_tb = await dataBase.collection("stores");
//     let users_tb = await dataBase.collection("users");
//     let storeDetails = await store_tb.findOne({
//       _id: new ObjectId(req.body.store_id),
//     });
//     let employeeDetails = await users_tb.findOne(
//       {
//         _id: new ObjectId(req.body.user_id),
//       },
//       { projection: { _id: 1, phone: 1, name: 1, emp_id: 1, user_type: 1 } }
//     );

//     let queryData = {
//       CompanyCode: "HM",
//       Invoice_No: req.body.invoice_no,
//       Invoice_Date: req.body.invoice_date,
//     };
//     var query = qs.stringify(queryData);
//     let getOrderDetailsconfig = {
//       method: "get",
//       maxBodyLength: Infinity,
//       url: "http://183.82.44.213/api/apxapi/GetInvoiceDetails?" + query,
//       headers: {
//         UserId: "WEBSITE",
//         SecurityCode: "3489-7629-9163-3979",
//       },
//     };
//     let orderResponse = await axios(getOrderDetailsconfig);
//     if (orderResponse?.data?.Table?.length > 0) {
//       if (
//         storeDetails.store_name == orderResponse?.data?.Table[0]?.BRANCH_NAME
//       ) {
//         let orderObj = {
//           id: uuidv4(),
//           order_details: orderResponse?.data?.Table[0],
//           employee_details: employeeDetails,
//           store_details: storeDetails,
//           created_at: new Date(),
//           created_by: employeeDetails?._id.toString(),
//           invoice_no: req.body.invoice_no,
//           invoice_date: req.body.invoice_date,
//         };
//         await sale_return_tb.insertOne(orderObj);
//         return res.json({
//           status: true,
//           data: orderObj,
//         });
//       } else {
//         return res.json({
//           status: false,
//           message: "Store names mismatch",
//         });
//       }
//     } else {
//       return res.json({
//         status: false,
//         message: "Invalid Invoice Number",
//       });
//     }
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// //#################THIS API SAYS ABOUT WHICH PRODUCT ARE YOU REPLACED###############
// app.put("/replaceProduct", replaceProduct);
// async function replaceProduct(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_tb = await dataBase.collection("sale_return");
//     await sale_return_tb.findOneAndUpdate(
//       { id: req.body.id },
//       {
//         $set: {
//           replace_product_details: req.body.replace_product_details,
//           old_price:
//             req.body.replace_product_details?.item_gross_rate +
//             req.body.replace_product_details?.item_tax_amt,
//         },
//       }
//     );
//     return res.json({
//       status: true,
//       message: "Replaced product saved successfully",
//     });
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// //########################## THIS API SELECT SAME OR DIFFERENT PRODUCT ########################
// app.post("/selectProduct", selectProduct);
// async function selectProduct(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_tb = await dataBase.collection("sale_return");
//     if (req.body.type == "same") {
//       let get_new_price = await apxPrice.getPriceFromPriceTemplate(
//         req.body.item_code
//       );
//       let new_product_obj = [
//         {
//           item_name: get_new_price[0]?.ITEM_NAME,
//           item_code: get_new_price[0]?.ITEM_CODE,
//           item_price: get_new_price[0]?.ITEM_PRICE,
//           sub_quantity: 1,
//           sub_price: 1 * get_new_price[0]?.ITEM_PRICE,
//         },
//       ];
//       await sale_return_tb.findOneAndUpdate(
//         { id: req.body.id },
//         {
//           $set: {
//             type: req.body.type,
//             new_product_price: get_new_price[0].ITEM_PRICE,
//             new_product_details: new_product_obj,
//             total_price: get_new_price[0].ITEM_PRICE,
//             total_quantity: 1,
//             extra_amount: 0,
//           },
//         }
//       );
//       return res.json({
//         status: true,
//         data: new_product_obj,
//       });
//     } else if (req.body.type == "different") {
//       let old_price_res = await sale_return_tb.findOne(
//         { id: req.body.id },
//         { projection: { old_price: 1 } }
//       );
//       const new_product_details = req.body.new_product_details.map((item) => {
//         const sub_total = item.item_price * item.sub_quantity;
//         return { ...item, sub_total };
//       });
//       let total_price = 0;
//       let total_quantity = 0;
//       let extra_amount = 0;
//       for (let i = 0; i < req.body.new_product_details?.length; i++) {
//         total_price += new_product_details[i].sub_total;
//         total_quantity += new_product_details[i].sub_quantity;
//       }
//       if (total_price > old_price_res?.old_price) {
//         extra_amount = total_price - old_price_res?.old_price;
//       }
//       await sale_return_tb.findOneAndUpdate(
//         { id: req.body.id },
//         {
//           $set: {
//             type: req.body.type,
//             new_product_price: total_price,
//             new_product_details: new_product_details,
//             total_price: total_price,
//             total_quantity: total_quantity,
//             extra_amount:extra_amount
//           },
//         }
//       );
//       return res.json({
//         status: true,
//         new_product_details: new_product_details,
//       });
//     }
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// //#################### CHECK AVALIABILITY STOCK###########################//
// app.post("/checkAvaliabilityStock", checkAvaliabilityStock);
// async function checkAvaliabilityStock(req, res) {
//   try {
//     let check_stock_response = await checkAvailabilityStock.checkStock(
//       req.body
//     );
//     let get_new_price = await apxPrice.getPriceFromPriceTemplate(
//       req.body.item_code
//     );
//     if (check_stock_response.length > 0) {
//       return res.json({
//         status: true,
//         data: check_stock_response,
//         get_new_price: get_new_price,
//       });
//     } else {
//       return res.json({
//         status: false,
//         message: "NO DATA FOUND",
//       });
//     }
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "Error",
//     });
//   }
// }

// //GETTING ALL SALE RETURN REASONS #######################
// app.get("/getSaleReturnReasons", getSaleReturnReasons);
// async function getSaleReturnReasons(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_reasons_tb = await dataBase.collection(
//       "sale_return_reasons"
//     );
//     let get_reasons_list = await sale_return_reasons_tb.distinct("name");
//     return res.json({
//       status: true,
//       data: get_reasons_list,
//     });
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// //####################### PRODUCT EXCAHNGE ################################
// app.post("/exchangeProducts", exchangeProduct);
// async function exchangeProduct(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_tb = await dataBase.collection("sale_return");
//     let new_product_response = await sale_return_tb.findOne({
//       id: req.body.id,
//     });
//     await sale_return_tb.findOneAndUpdate(
//       { id: req.body.id },
//       {
//         $set: {
//           new_product_details: new_product_response?.new_product_details,
//           availability_stock: req.body.availability_stock,
//           reason: req.body.reason,
//           attachments: req.body.attachments,
//           status: "Exchange"
//         },
//       }
//     );
//     return res.json({
//       status: true,
//       message: "Product Exchange",
//     });
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// //#################### GET ALL EXCAHNGE PRODUCTS FOR ADMIN ###################
// app.get("/adminApprovalProducts", adminApprovalProducts);
// async function adminApprovalProducts(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_tb = await dataBase.collection("sale_return");
//     let list_of_exchange_products = await sale_return_tb
//       .find(
//         { status: "Exchange" },
//         {
//           projection: {
//             invoice_no: 1,
//             invoice_date: 1,
//             type: 1,
//             attachemnts: 1,
//             reason: 1,
//             new_product_price: 1,
//             availability_stock: 1,
//             replace_product_details: 1,
//             new_product_details: 1,
//             id: 1,
//           },
//         }
//       )
//       .toArray();
//     return res.json({
//       status: true,
//       data: list_of_exchange_products,
//     });
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// //################### GENERTE COUPON CODE #####################

// async function generateReferenceId() {
//   const couponLength = 6;
//   const characters =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz";
//   let coupon = "";
//   for (let i = 0; i < couponLength; i++) {
//     const randomIndex = Math.floor(Math.random() * characters.length);
//     coupon += characters.charAt(randomIndex);
//   }
//   return coupon;
// }

// //###################### EXCHANGE PRODUCT DETAILS VIEW ########################
// app.put("/exchangeProductApprovalByAdmin", exchangeProductApprovalByAdmin);
// async function exchangeProductApprovalByAdmin(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_tb = await dataBase.collection("sale_return");
//     if (req.body.status == "Reject") {
//       await sale_return_tb.findOneAndUpdate(
//         { id: req.body.id },
//         { $set: { status: req.body.status } }
//       );
//     } else {
//       let reference_id = await generateReferenceId();
//       await sale_return_tb.findOneAndUpdate(
//         { id: req.body.id },
//         { $set: { status: req.body.status, reference_id: reference_id } }
//       );
//     }

//     return res.json({
//       status: true,
//       message: `Admin ${req.body.status} Successfully`,
//     });
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// //SCREEN -1 get All Approval exchange stock by Admin
// app.get("/getApprovalExchangeStockByAdmin", getApprovalExchangeStockByAdmin);
// async function getApprovalExchangeStockByAdmin(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_tb = await dataBase.collection("sale_return");
//     let sale_return_details = await sale_return_tb
//       .find(
//         {
//           $and: [
//             { created_by: req.query.created_by },
//             {
//               $or: [{ status: "Approved" }, { status: "Reject" }],
//             },
//           ],
//         },
//         { projection: { reference_id: 0 } }
//       )
//       .sort({ created_at: -1 })
//       .toArray();
//     return res.json({
//       status: true,
//       data: sale_return_details,
//     });
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// //############### CONFIRM EXCHANGE PRODUCT ############################//
// app.post("/confirmExchangeProduct", confirmExchangeProduct);
// async function confirmExchangeProduct(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_tb = await dataBase.collection("sale_return");
//     //############# need to verify the reference Number #############
//     let sale_return_product = await sale_return_tb.findOne(
//       { id: req.body.id },
//       { projection: { reference_id: 1 } }
//     );
//     if (sale_return_product?.reference_id == req.body.reference_id) {
//       await sale_return_tb.findOneAndUpdate(
//         { id: req.body.id },
//         { $set: { status: "Returned" } }
//       );
//       return res.json({
//         status: true,
//         message: "Product Received Successfully",
//       });
//     } else {
//       return res.json({
//         status: false,
//         message: "Reference number mismatch",
//       });
//     }
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// // GET PRODUCTS FROM APX AND INSERT THOSE PRODUCTS IN MY DATA BASE COLLECTION AS  SALE RETURN APX_PRODUCT
// app.get("/apxSyncProducts", apxSyncProducts);
// async function apxSyncProducts(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_apx_products_tb = await dataBase.collection(
//       "sale_return_apx_products"
//     );
//     let stock_transfer_apx_products_tb = await dataBase.collection(
//       "stock_transfer_apx_products"
//     );
//     let config = {
//       method: "get",
//       maxBodyLength: Infinity,
//       url: "http://183.82.44.213/api/apxapi/GetItemModelInfo?CompanyCode=HM&Product=0&Brand=0&ItemCategory=0&CreatedOnStartDate=0&CreatedOnEndDate=0&ModifiedOnStartDate=0&ModifiedOnEndDate=0&ItemNameLike=0&Status=All&ItemClassificationType=NONE&ItemClassificationValue=0",
//       headers: {
//         UserId: "WEBSITE",
//         SecurityCode: "3489-7629-9163-3979",
//       },
//     };
//     let response = await axios(config);
//     for (var i = 0; i < response?.data?.Data.length; i++) {
//       await sale_return_apx_products_tb.updateOne(
//         { ITEM_CODE: response?.data?.Data[i].ITEM_CODE },
//         {
//           $set: {
//             BRAND_NAME: response?.data?.Data[i].BRAND_NAME,
//             ITEM_NAME: response?.data?.Data[i].ITEM_NAME,
//             ITEM_CODE: response?.data?.Data[i].ITEM_CODE,
//             PROD_CATG_NAME: response?.data?.Data[i].PROD_CATG_NAME,
//             PRODUCT_NAME: response?.data?.Data[i].PRODUCT_NAME,
//             ITEM_STATUS: response?.data?.Data[i].ITEM_STATUS,
//             CREATED_ON: response?.data?.Data[i].CREATED_ON,
//             apx_sync_date: new Date(),
//           },
//         },
//         { upsert: true }
//       );
//       await stock_transfer_apx_products_tb.updateOne(
//         { ITEM_CODE: response?.data?.Data[i].ITEM_CODE },
//         {
//           $set: {
//             BRAND_NAME: response?.data?.Data[i].BRAND_NAME,
//             ITEM_NAME: response?.data?.Data[i].ITEM_NAME.toString(),
//             ITEM_CODE: response?.data?.Data[i].ITEM_CODE.toString(),
//             PROD_CATG_NAME: response?.data?.Data[i].PROD_CATG_NAME,
//             PRODUCT_NAME: response?.data?.Data[i].PRODUCT_NAME,
//             ITEM_STATUS: response?.data?.Data[i].ITEM_STATUS,
//             CREATED_ON: response?.data?.Data[i].CREATED_ON,
//             apx_sync_date: new Date(),
//           },
//         },
//         { upsert: true }
//       );
//     }
//     return res.json({
//       status: true,
//       message: "Products Addedd successfully",
//     });
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// //GET LIST OF CATEGORIES
// app.get("/getCategoryList", getCategoryList);
// async function getCategoryList(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_apx_products_tb = await dataBase.collection(
//       "sale_return_apx_products"
//     );
//     let categoryList = await sale_return_apx_products_tb.distinct(
//       "PROD_CATG_NAME"
//     );
//     return res.json({
//       status: true,
//       data: categoryList,
//     });
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// //GET BRAND LIST
// app.get("/getBrandList", getCategoryList);
// async function getCategoryList(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_apx_products_tb = await dataBase.collection(
//       "sale_return_apx_products"
//     );
//     let brandList = await sale_return_apx_products_tb.distinct("BRAND_NAME");
//     return res.json({
//       status: true,
//       data: brandList,
//     });
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// //GET MODEL NAMES (ITEM NAMES AND ITEM CODE )
// app.post("/getItemList", getItemList);
// async function getItemList(req, res) {
//   try {
//     let dataBase = await mongo.connect();
//     let sale_return_apx_products_tb = await dataBase.collection(
//       "sale_return_apx_products"
//     );
//     let get_item_names = await sale_return_apx_products_tb
//       .find(
//         { BRAND_NAME: req.body.brandName },
//         { projection: { ITEM_NAME: 1, ITEM_CODE: 1 } }
//       )
//       .toArray();
//     return res.json({
//       status: true,
//       data: get_item_names,
//     });
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       status: false,
//       message: "ERROR",
//     });
//   }
// }

// module.exports = app;


let apx  = [ '650a9ffd2ed403b8214cc7df',"9090" ]
let database =[ '650a9ffd2ed403b8214cc7df', '6513f755f35fb9022beac52a' ]

// Use map to create a new array with elements from apxStore that are not in database
let valuesToAdd = apx.filter(value => !database.includes(value));
database = [...database, ...valuesToAdd];

console.log(database);
