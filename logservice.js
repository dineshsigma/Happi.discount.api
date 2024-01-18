// import statments
const { createLogger, transports, format } = require("winston");
const LokiTransport = require("winston-loki");
let axios = require("axios");
// declerations
let types = [
  "emerg",
  "alert",
  "crit",
  "error",
  "warning",
  "notice",
  "info",
  "debug",
  "locally",
];
// configutaions
// const l_log = createLogger({
//   transports: [
//     new LokiTransport({
//       host: process.env.LOG_URL || "https://loki.iipl.app",
//       labels: {
//         app: process.env.APP_NAME || "HAPPI-API",
//         env: process.env.ENV || "dev",
//       },
//       json: true,
//       format: format.json(),
//       replaceTimestamp: true,
//       interval: 30,
//       basicAuth: process.env.LOG_BASIC_AUTH || "dev:mlbi4a1iWagAKaw",
//       onConnectionError: (err) => console.error(err),
//     }),
//     new transports.Console({
//       format: format.combine(format.simple(), format.colorize()),
//     }),
//   ],
// });

exports.log = function (type, req = null, message, json) {
  var labels = {
    level: type,
    app: "HAPPI-DISCOUNT-API",
    env: "dev",
  };
  if (types.indexOf(type) == -1) {
    return;
  }
  if (req != null) {
    labels.path = req.path;
    labels.method = req.method;
    labels.headers = req.headers;
    labels.query = req.query;
    labels.params = req.params;
    labels.json = json;
    if (
      labels.method?.toLowerCase() == "post" ||
      labels.method?.toLowerCase() == "put"
    ) {
      labels.body = req.body;
    }
  }
  let data = {
    streams: [
      {
        stream: labels,
        values: [
          [
            new Date().getTime() * 1000 * 1000 + "",
            JSON.stringify({
              level: type,
              message: message,
            }),
          ],
        ],
      },
    ],
  };
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://loki.iipl.app/loki/api/v1/push",
    headers: {
      Authorization: "Basic ZGV2Om1sYmk0YTFpV2FnQUthdw==",
      "Content-Type": "application/json",
    },
    data: JSON.stringify(data),
  };
  axios
    .request(config)
    .then((response) => {
      console.log("sent success");
      // console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error.response.data);
    });
};

exports.stock_transferlog = function (type, req = null, message, json) {
  var labels = {
    level: type,
    app: "HAPPI-STOCK-TRANSFER",
    env: "dev",
  };
  if (types.indexOf(type) == -1) {
    return;
  }
  if (req != null) {
    labels.path = req.path;
    labels.method = req.method;
    labels.headers = req.headers;
    labels.query = req.query;
    labels.params = req.params;
    labels.json = json;
    if (
      labels.method?.toLowerCase() == "post" ||
      labels.method?.toLowerCase() == "put"
    ) {
      labels.body = req.body;
    }
  }
  let data = {
    streams: [
      {
        stream: labels,
        values: [
          [
            new Date().getTime() * 1000 * 1000 + "",
            JSON.stringify({
              level: type,
              message: message,
            }),
          ],
        ],
      },
    ],
  };
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://loki.iipl.app/loki/api/v1/push",
    headers: {
      Authorization: "Basic ZGV2Om1sYmk0YTFpV2FnQUthdw==",
      "Content-Type": "application/json",
    },
    data: JSON.stringify(data),
  };
  axios
    .request(config)
    .then((response) => {
      console.log("sent success");
      // console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error.response.data);
    });
};

exports.sale_returnlog = function (type, req = null, message, json) {
  var labels = {
    level: type,
    app: "HAPPI-SALE-RETURN",
    env: "dev",
  };
  if (types.indexOf(type) == -1) {
    return;
  }
  if (req != null) {
    labels.path = req.path;
    labels.method = req.method;
    labels.headers = req.headers;
    labels.query = req.query;
    labels.params = req.params;
    labels.json = json;
    if (
      labels.method?.toLowerCase() == "post" ||
      labels.method?.toLowerCase() == "put"
    ) {
      labels.body = req.body;
    }
  }
  let data = {
    streams: [
      {
        stream: labels,
        values: [
          [
            new Date().getTime() * 1000 * 1000 + "",
            JSON.stringify({
              level: type,
              message: message,
            }),
          ],
        ],
      },
    ],
  };
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://loki.iipl.app/loki/api/v1/push",
    headers: {
      Authorization: "Basic ZGV2Om1sYmk0YTFpV2FnQUthdw==",
      "Content-Type": "application/json",
    },
    data: JSON.stringify(data),
  };
  axios
    .request(config)
    .then((response) => {
      console.log("sent success");
      // console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error.response.data);
    });
};
