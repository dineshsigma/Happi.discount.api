
let fcm = require('fcm-notification');

let firebase_config = {
    "type": "service_account",
    "project_id": "happi-ticket-mgmt-9647e",
    "private_key_id": "acc4b669c58dc5d2797fe079b4403c70b5ac4553",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQClpoDNnKeM3FVq\ndp+8Nb+SWP9ddWrU77yfQyv0sX6RjeZOzsKn+feHTs2UIozHQD+Ui3WqgkEjqfNV\nycvJkMOpHUlFQavoBGRSAY3MfLSB4gARBmNblxJeI199om1+vmXX1FJwNY2qZzeI\n8+4WtZlgO86V41GA6z3IQZkJHfSEJ5zRVBQDwZHvO8ZobxnI2c/m6OD01mDjiOTI\ni1eVer21wnLc3JzrrInP8jd2EHtkCvtn4QHSO88ok++gZfhejUZ1RfbPbmbfL2bx\nA5XnlNIzfTyVYdHDjTYOPXjHug+R/+DpbI511c1E4sDRhOvEh2ipM8tfIjyf7s8e\nUDDg5BbvAgMBAAECggEAKFycGL1ZY+yR0WmK/UB5Z67QthR0jeLGKmYjETGoXc3d\n9ojRjD1Pb0Qnujb651fDxi1+46duOMLhvB75zSi9S/kLT9kzCkr7qLGhO9iM4PLQ\nwlU0o235dz+WNlX76Px6cy7UUWvzEzioIvIQqq7f6r9X1FS5mLh46tD0+XA3knVx\n/MySG871FZEmAhoCSlBoqFxlwsgWc5M8Zarmgx6K2hOSkujiSWekkTG94UqTxIg2\n8AJiTB02p1o/O2FcqD4yWKK3IlMNbsDm0vq7Ypv2MhEVAFxsYFFQbVAcQuDjpQWV\nnoL6O8TbgxPW+RkjmM6RLadxFaqXoVEwfDha4aufIQKBgQDX5NsOHVm35RBIcIfP\nq/+31Zsdp0xqAhmLsT+Wj9tIzCTRKGsmUY3YJyV+OEQ3XEFn5+TdyrH2rv7sj9I1\nWz7xbOrU6IIC422FRDD6KspGSgEKuAUT05TwmEf4dilcTxAmicC0j+w29nWu3SWd\n9f9TuiRUn7Wm4++tVAOArQdL4QKBgQDEbD5NCLRChmkoAMz7wuM7glE/cL8lNY68\n/kQQYLzFV0wBKkKFDMNCJ4pPyQZStq0Od2kwxkoyLbC0hB169Rac79e9zu/r4Mly\ne2makdhYRiCIghiGGoXFHjnFPQzpk+yZf9xyaRCxDlmrz3tbJVkNrQ55Xf9deRmM\nEqspINU8zwKBgDQnfSOzw3DBTWWyiZyJmIT4fTh0qekSCMnOT+Y3amnzpxFACmJ/\nYRzOmCgdv50AFGzdgFR0GvnU3JCZTdbF7Da2cSRt5rp75oFDL/G/VI4WYpoMSm23\nt0tH/lrvcJ50Gxq0PHFiM1Yzw8oyclvuiXfYh95JlsByX/wnR5FWO2UBAoGAGLei\nU2FQBbsSSoVnRhstKxToEnqmoxENSD0a5ZC20IJ+vvrJaiLEA3QkVIvwbsIsHtDp\n/MhHF+9l+CFT8GAdG1yXInyC9oTP9McQ7/GAbwNMHsF4Qo/d24NFM8vN7yq9MEfF\nvuP3xMAQiq1OUZbukOkBFEa+1s1haJ4EyeUm0EMCgYBAyX/tO/b51/37YsOvdESe\nJR07QcDc4imZUHVUtripo4tY5zcArGxazZpHWub4L2rnllm6emtGEAw5lvzETJAq\nJX9QTkOA08IgPhC+1O4p4XW2zTY9sIavBUUjlLmgoASO2O0YHxmOJO4ebRpDhnI4\nePRsMdMJjgBidZ/RchV1cg==\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-mw7j3@happi-ticket-mgmt-9647e.iam.gserviceaccount.com",
    "client_id": "108975574057787691171",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-mw7j3%40happi-ticket-mgmt-9647e.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
}

let FCM = new fcm(firebase_config);
let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiODEwNjgzODQzMiIsImlhdCI6MTY4OTYwNzQ4MywiZXhwIjoxNjk3MzgzNDgzfQ.aPMTpbStHlFyx9fD9Y1zy-SUxDAJdzPvWIHi5_S4NP8';

let message = {
    notification: {
        title: 'Title of notification',
        body: 'Body of notification'
    },
    token: token
};

async function dinesh(message,token,cb){
    FCM.send(message, token, function (err, response) {
        console.log("response",response)
        cb(err, response)
       
    })

}

//dinesh(message,token)



//BI3B4Kmk13_qLUEqWd3ZQjt4U6hQ7Fdt5jvU6fP6QaCLR4HlSmzsKfGTlGNvDyKLHR9PsBJHKX2-A6dOnFgvr-A