"use strict";

const AWS = require("aws-sdk");
const doc = require("dynamodb-doc");
const Q = require("kew");
const dataflashlog = require("dataflashlog");
const util = require("util");

const bucket = process.env.BUCKET;
const database = process.env.DATABASE;

module.exports.requestUploadURL = (event, context, callback) => {
  console.log('Entering requestUploadURL', event);
  var s3 = new AWS.S3();

  var params = JSON.parse(event.body);

  // FIXME Need to check the contents of params here

  var s3Params = {
    Bucket: bucket,
    Key:  params['name'],
    ContentType: params['content-type'],
    ACL: "public-read",
  };
  console.log('Calculating getSignedUrl for ', s3Params);

  var uploadURL = s3.getSignedUrl("putObject", s3Params);

  callback(null, {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Authorization, Origin, Accept"
    },
    body: JSON.stringify({ uploadURL: uploadURL }),
  });
};

/* CORS OPTIONS request
 */
module.exports.requestUploadURLOptions = (event, context, callback) => {
  var s3 = new AWS.S3();

  callback(null, {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Authorization, Origin, Accept"
    },
  });
};

module.exports.bucketTrigger = (event, context, callback) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

  console.log("About to call getS3Object");
  getS3Object(bucket, key)
    .then(data => parseDatafile(key, data))
    .then(data => putItem(key, data))
    .then(callback(null, "Trigger executed OK"))
    .fail(err => callback(err, null));
};

module.exports.dbTrigger = (event, context, callback) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  event.Records.forEach((record) => {
    if (record.eventName === "INSERT") {
      var filename = record.dynamodb.Keys.filename.S;
      console.log("Processing new entry " + filename);
      getS3Object(bucket, filename)
        .then(data => parseDatafile2(filename, data))
        .then(data => updateItem(filename, data))
        .fail(err => { console.error("Failed to process " + filename + " : " + err);});
    } else {
      console.error("Unable to process event: " + record.eventName);
    }
  });
  
  callback(null, `Processed ${event.Records.length} records.`);
};

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

function parseDatafile(key, s3file) {
  console.log("Entering parseDatafile with key=" + key);
  const defer = Q.defer();

  dataflashlog.parse(s3file.Body, function(err, data) {
    if (err) {
      console.log("Error: " + err);
      defer.reject();
    }

    var firstTimestamp=0;
    var lastTimestamp=0;

    data.messages.forEach(function(event) {
      if (event.hasOwnProperty("TimeUS")) {
        var timestamp = event.TimeUS;

        if (timestamp < firstTimestamp || firstTimestamp === 0) {
          firstTimestamp = timestamp;
        }

        if (timestamp > lastTimestamp) {
          lastTimestamp = timestamp;
        }
        
      }
    });

    var reference = data.referenceTimestamp;
    data.logStart = reference.reference + ((firstTimestamp - reference.timeus) / 1000);
    data.logEnd = reference.reference + ((lastTimestamp - reference.timeus) / 1000);
    data.size = s3file.ContentLength;

    console.log("Start: " + new Date(data.logStart) + ", End:" + new Date(data.logEnd));

    console.log("OK");
    defer.resolve(data);
  });

  console.log("Leaving parseDatafile");
  return defer.promise;
}

function putItem(key, data) {
  console.log("Entering putItem with key=" + key);

  const dynamo = new doc.DynamoDB();
  const defer = Q.defer();

  const params = {
    TableName: database,
    Item: {
      filename: key,
      timestamps: { 
        start: data.logStart,
        finish: data.logEnd
      },
      size: data.size
    }
  };

  dynamo.putItem(params, defer.makeNodeResolver());

  console.log("Leaving putItem");
  return defer.promise;
}

function parseDatafile2(key, s3file) {
  console.log("Entering parseDatafile with key=" + key);
  const defer = Q.defer();

  dataflashlog.parse(s3file.Body, function(err, parsedData) {
    if (err) {
      console.log("Error: " + err);
      defer.reject();
    }

    var data = {};
    data.contents = {};
    data.contents.power = false;
    data.contents.altitude = false;
    data.contents.attitude = false;
    data.contents.gps = false;
    data.contents.imu = false;
    data.contents.ntun = false;
    data.contents.err = false;
    data.messages = [];
    data.parameters = {};

    parsedData.messages.forEach(function(event) {
      switch(event.name) {
      case "ERR":
        data.contents.err = true;
        break;
      case "GPS":
        data.contents.gps = true;
        break;
      case "CURR":
        data.contents.power = true;
        break;
      case "IMU":
        data.contents.imu = true;
        break;
      case "NTUN":
        data.contents.ntun = true;
        break;
      case "ATT":
        data.contents.attitude = true;
        break;
      case "BARO":
        data.contents.attitude = true;
        break;
      case "PARM":
        data.parameters[event.Name] = event.Value;
        break;
      case "MSG":
        var message = {};
        message.text = event.Message;
        message.timestamp = parsedData.referenceTimestamp.reference + ((event.TimeUS - parsedData.referenceTimestamp.timeus) / 1000);
        data.messages.push(message);
        break;
      }
    });

    defer.resolve(data);
  });

  console.log("Leaving parseDatafile");
  return defer.promise;
}   

function updateItem(key, data) {
  const docClient = new AWS.DynamoDB.DocumentClient();

  console.log("Entering putItem with key=" + key);

  const defer = Q.defer();
  const params = {
    TableName: database,
    Key: {
      filename: key
    },
    AttributeUpdates: {
      err: {
        Action: "PUT",
        Value: data.contents.err
      },
      gps: {
        Action: "PUT",
        Value: data.contents.gps
      },
      power: {
        Action: "PUT",
        Value: data.contents.power
      },
      altitude: {
        Action: "PUT",
        Value: data.contents.altitude
      },
      attitude: {
        Action: "PUT",
        Value: data.contents.attitude
      },
      imu: {
        Action: "PUT",
        Value: data.contents.imu
      },
      ntun: {
        Action: "PUT",
        Value: data.contents.ntun
      },
      messages: {
        Action: "PUT",
        Value: data.messages
      },
      parameters: {
        Action: "PUT",
        Value: data.parameters
      }
    }
  };

  docClient.update(params, defer.makeNodeResolver());

  console.log("Leaving putItem");
  return defer.promise;
}         