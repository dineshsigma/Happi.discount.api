const { MongoClient } = require("mongodb");
let database = null;
let happi_discount_database = null;
//local
const URI =
  process.env.MONGO_URL ||
  "mongodb://happimain:tUDuD9okePhlyl%2B@happi-main-db.happimobiles.com:27017/?authMechanism=DEFAULT&authSource=happi-ticket-mgmt";
//production
// const URI =
//   process.env.MONGO_URL ||
//   "mongodb://happimain:tUDuD9okePhlyl%2B@127.0.0.1:27017/?authMechanism=DEFAULT&authSource=happi-ticket-mgmt";

//local
//const HappiDiscountURI = process.env.MONGO_URL || "mongodb://happimain:tUDuD9okePhlyl%2B@happi-main-db.happimobiles.com:27017/?authMechanism=DEFAULT&authSource=happi-new-sls";
//production
const HappiDiscountURI =
  process.env.MONGO_URL ||
  "mongodb://happimain:tUDuD9okePhlyl%2B@127.0.0.1:27017/?authMechanism=DEFAULT&authSource=happi-new-sls";
//######### HAPPI TICKET MANAGEMENT DATABASE CONNECTION #####################
exports.connect = async function () {
  if (database) {
    return database;
  }
  let client = new MongoClient(URI);
  await client.connect();
  database = client.db(process.env.MONGO_DB || "happi-ticket-mgmt");
  return database;
};
//########## HAPPI DISCOUNT DATABASE CONNECTION #######################
exports.happi_discount_connect = async function () {
  if (happi_discount_database) {
    return happi_discount_database;
  }
  let client = new MongoClient(HappiDiscountURI);
  await client.connect();
  happi_discount_database = client.db(process.env.MONGO_DB || "happi-new-sls");
  return happi_discount_database;
};
``;
