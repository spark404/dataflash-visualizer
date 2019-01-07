"use strict";

const AWS = require("aws-sdk");
const doc = require("dynamodb-doc");
const Q = require("kew");
const dataflashlog = require("dataflashlog");
const util = require("util");

const parsers = require("./parsers");

const bucket = process.env.BUCKET;
const database = process.env.DATABASE;

module.exports.listItems = function(event, context, callback) {
  listEntries()
    .then(data => response(callback, data, 200))
    .fail(err => response(callback, err, 500));
};

module.exports.retrieveMetadata = function(event, context, callback) {
  if (event === null || !event.hasOwnProperty("resource")) {
    callback(new Error("Probably not a request from the API gateway"));
  }

  if (!event.pathParameters.hasOwnProperty("reportid") || event.pathParameters["reportid"] === undefined) {
    response(callback, new Error("Missing required path parameter reportId"), 409);
  }

  console.log("*** MAIN ***");
  console.log("event: " + util.inspect(event));
  console.log("context: " + util.inspect(context));
  retrieveEntryByFilename(event.pathParameters.reportid)
    .then(data => response(callback, data, 200))
    .fail(err => response(callback, err, 500));
};

module.exports.parseAttitude = function(event, context, callback) {
  if (event === null || !event.hasOwnProperty("resource")) {
    callback(new Error("Probably not a request from the API gateway"));
  }

  if (!event.pathParameters.hasOwnProperty("reportid") || event.pathParameters["reportid"] === undefined) {
    response(callback, new Error("Missing required path parameter reportId"), 409);
  }

  console.log("*** MAIN ***");
  console.log("event: " + util.inspect(event));
  console.log("context: " + util.inspect(context));
  getS3Object(bucket, event.pathParameters.reportid)
    .then(data => parsers.parseAttitude(event.pathParameters.reportid, data))
    .then(data => response(callback, data, 200))
    .fail(err => response(callback, err, 500));
};  

module.exports.parseErrors = function(event, context, callback) {
  if (event === null || !event.hasOwnProperty("resource")) {
    callback(new Error("Probably not a request from the API gateway"));
  }

  if (!event.pathParameters.hasOwnProperty("reportid") || event.pathParameters["reportid"] === undefined) {
    response(callback, new Error("Missing required path parameter reportId"), 409);
  }

  console.log("*** MAIN ***");
  console.log("event: " + util.inspect(event));
  console.log("context: " + util.inspect(context));
  getS3Object(bucket, event.pathParameters.reportid)
    .then(data => parsers.parseErrors(event.pathParameters.reportid, data))
    .then(data => response(callback, data, 200))
    .fail(err => response(callback, err, 500));
};  

module.exports.parseGps = function(event, context, callback) {
  if (event === null || !event.hasOwnProperty("resource")) {
    callback(new Error("Probably not a request from the API gateway"));
  }

  if (!event.pathParameters.hasOwnProperty("reportid") || event.pathParameters["reportid"] === undefined) {
    response(callback, new Error("Missing required path parameter reportId"), 409);
  }

  console.log("*** MAIN ***");
  console.log("event: " + util.inspect(event));
  console.log("context: " + util.inspect(context));
  getS3Object(bucket, event.pathParameters.reportid)
    .then(data => parsers.parseGps(event.pathParameters.reportid, data))
    .then(data => response(callback, data, 200))
    .fail(err => response(callback, err, 500));
};  

module.exports.parseImu = function(event, context, callback) {
  if (event === null || !event.hasOwnProperty("resource")) {
    callback(new Error("Probably not a request from the API gateway"));
  }

  if (!event.pathParameters.hasOwnProperty("reportid") || event.pathParameters["reportid"] === undefined) {
    response(callback, new Error("Missing required path parameter reportId"), 409);
  }

  console.log("*** MAIN ***");
  console.log("event: " + util.inspect(event));
  console.log("context: " + util.inspect(context));
  getS3Object(bucket, event.pathParameters.reportid)
    .then(data => parsers.parseImu(event.pathParameters.reportid, data))
    .then(data => response(callback, data, 200))
    .fail(err => response(callback, err, 500));
};  

module.exports.parsePower = function(event, context, callback) {
  if (event === null || !event.hasOwnProperty("resource")) {
    callback(new Error("Probably not a request from the API gateway"));
  }

  if (!event.pathParameters.hasOwnProperty("reportid") || event.pathParameters["reportid"] === undefined) {
    response(callback, new Error("Missing required path parameter reportId"), 409);
  }

  console.log("*** MAIN ***");
  console.log("event: " + util.inspect(event));
  console.log("context: " + util.inspect(context));
  getS3Object(bucket, event.pathParameters.reportid)
    .then(data => parsers.parsePower(event.pathParameters.reportid, data))
    .then(data => response(callback, data, 200))
    .fail(err => response(callback, err, 500));
};  

function listEntries() {
  const docClient = new AWS.DynamoDB.DocumentClient();
  console.log("Entering queryDatabase");
  const defer = Q.defer();

  var params = {
    TableName : database,
    AttributesToGet : [
      "filename",
      "altitude",
      "attitude",
      "err",
      "gps",
      "imu",
      "ntun",
      "power",
      "size",
      "timestamps"
    ]
  };

  docClient.scan(params, function(err, data) {
    if (err) {
      defer.reject(err);
    } else {
      defer.resolve(data.Items);
    }
  });

  return defer.promise;
}

function retrieveEntryByFilename(filename) {
  const docClient = new AWS.DynamoDB.DocumentClient();
  console.log("Entering queryDatabase");
  const defer = Q.defer();

  var params = {
    TableName : database,
    Key: {
      filename: filename
    }
  };

  docClient.get(params, function(err, data) {
    if (err) {
      defer.reject(err);
    } else {
      defer.resolve(data.Item);
    }
  });

  return defer.promise;
}

function response(callback, data, statuscode) {
  console.log("Entering response");

  if (data === undefined) {
    var errorMessage = {};
    errorMessage.message = "No entry found in database";

    const response = {
      statusCode: 404,
      body: JSON.stringify(errorMessage)
    };

    callback(null, response);
  } else {
    const response = {
      statusCode: statuscode,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(data)
    };

    callback(null, response);
  }
}

function getS3Object(bucket, key) {
  var s3 = new AWS.S3();
  console.log("Entering getS3Object with bucket=" + bucket + " and key=" + key);

  const defer = Q.defer();
  const params = {
    Bucket: bucket,
    Key: key,
  };
  s3.getObject(params, function(err, data) {
    if (err) {
      console.log("Error: " + err);
      defer.reject();
    }

    console.log("File data : " + util.inspect(data));
    console.log("OK");
    defer.resolve(data);
  });

  console.log("Leaving getS3Object");
  return defer.promise;
}