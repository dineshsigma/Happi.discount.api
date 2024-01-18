let AWS = require('aws-sdk');
async function getSignedUrl(folderpath, filename, url_type) {

  let credentials = {
    accessKeyId: "AKIASTAEMZYQ3D75TOOZ",
    secretAccessKey: "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",
    region: "ap-south-1"
  };
  let s3 = new AWS.S3(credentials);
  let params;
  if (url_type == 'putObject') {
    params = { Bucket: 'happimobiles', Key: `cyechampProductImages/${folderpath}/${filename}`, ACL: "public-read", };

  } else {
    params = { Bucket: 'happimobiles', Key: `cyechampProductImages/${folderpath}/${filename}`, Expires: 100000 };

  }
  let response = await s3.getSignedUrl(url_type, params)
  return response

}


module.exports.getSignedUrl = getSignedUrl;
