# IIPL LOGGER

How to push Back End logs to IIPL server.


### service code
logservice.js
```js
// import statments
const { createLogger, transports, format } = require("winston");
const  LokiTransport = require("winston-loki");

// decleration
let  types = ['emerg', 'alert', 'crit', 'error', 'warning', 'notice', 'info', 'debug']

// configutaions
const  logger = createLogger({
	transports: [new  LokiTransport({
    host:  process.env.LOG_URL || "https://loki.iipl.app",
    labels: { app:  process.env.APP_NAME || "HAPPI-API", env :        process.env.ENV || "dev" },
    json:  true,
    format:  format.json(),
    replaceTimestamp:  true,
    interval:  30,
    basicAuth:  process.env.LOG_BASIC_AUTH || "dev:mlbi4a1iWagAKaw",
    onConnectionError: (err) =>  console.error(err)
}),
new  transports.Console({
	format:  format.combine(format.simple(), format.colorize())
})]
})
// log functions
exports.log = function (type, req = null, message) {
	let  params = {}
	if (req != null) {
		params.path = req.path;
		params.method = req.method;
		params.headers = req.headers;
		params.query = req.query;
		params.params = req.params;
		if (params.method.toLowerCase() == "post" || params.method.toLowerCase() == "put") {
			params.body = req.body
		}
	}
	if (types.indexOf(type) == -1) {
		return;
	}
	logger.log({ level:  type, message:  message, params:  params })
}
```


### import service code 
import the service in controller / models etc.

```.js
let  logsService = require('./logservice.js')
```
```js
.
.
.
catch(error){
	logsService.log('error', req, error + "")
}
```       

## log functions params 

1. error type* : 'emerg', 'alert', 'crit', 'error', 'warning', 'notice', 'info', 'debug'
2. req: API request if necessary to get headers, query, params, url, method 
3. message*: readable message for more understand the issue 
